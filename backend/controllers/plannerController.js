const db = require('../config/db');
const plannerService = require('../services/plannerService');

// Retrieve budget pre-fill data (checks planner_allocations table first, then transaction aggregates)
exports.getPrefillData = async (req, res) => {
  try {
    const userId = req.user.id;
    // Resolve target month: query param or current month name
    const monthSelection = req.query.monthSelection || new Date().toLocaleString('en-US', { month: 'long' });

    console.log(`[Prefill Data] Aggregating budgets for User: ${userId}, Month: "${monthSelection}"`);

    // 1. Fetch user currency setting
    const [userRows] = await db.query('SELECT currency FROM users WHERE id = ?', [userId]);
    const currency = userRows[0]?.currency || 'INR';

    // 2. Query planner_allocations database for custom category entries saved previously
    const [savedAllocations] = await db.query(
      `SELECT category_name, amount FROM planner_allocations 
       WHERE user_id = ? AND month_selection = ?`,
      [userId, monthSelection]
    );

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    const expenseBreakdown = {};

    // 3. Fetch current monthly income from transactions table (to prefill income input)
    const [incomeCurrent] = await db.query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = ? AND type = 'income'
         AND YEAR(date) = YEAR(CURRENT_DATE())
         AND MONTH(date) = MONTH(CURRENT_DATE())`,
      [userId]
    );
    monthlyIncome = parseFloat(incomeCurrent[0].total) || 50000; // default 50k INR fallback

    if (savedAllocations.length > 0) {
      console.log(`[Prefill Data] Found ${savedAllocations.length} saved custom allocations in DB.`);
      savedAllocations.forEach(row => {
        expenseBreakdown[row.category_name] = parseFloat(row.amount) || 0;
        monthlyExpenses += parseFloat(row.amount) || 0;
      });

      return res.status(200).json({
        monthlyIncome,
        monthlyExpenses,
        expenseBreakdown,
        currency,
        currencySymbol: '₹',
        source: 'planner_allocations'
      });
    }

    // 4. Fallback: No planner allocations saved. Fetch aggregates from actual transactions history
    console.log('[Prefill Data] No saved allocations found. Aggregating transaction history ledger...');
    
    // Check transactions in the current month
    const [expenseCurrent] = await db.query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = ? AND type = 'expense'
         AND YEAR(date) = YEAR(CURRENT_DATE())
         AND MONTH(date) = MONTH(CURRENT_DATE())`,
      [userId]
    );
    monthlyExpenses = parseFloat(expenseCurrent[0].total) || 0;

    let targetYear = new Date().getFullYear();
    let targetMonth = new Date().getMonth() + 1;

    // Check most recent transactions if current month is blank
    if (monthlyIncome === 50000 && monthlyExpenses === 0) {
      const [recentCheck] = await db.query(
        `SELECT YEAR(date) as y, MONTH(date) as m FROM transactions 
         WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
        [userId]
      );
      if (recentCheck.length > 0) {
        targetYear = recentCheck[0].y;
        targetMonth = recentCheck[0].m;

        const [incomeRecent] = await db.query(
          `SELECT SUM(amount) as total FROM transactions 
           WHERE user_id = ? AND type = 'income'
             AND YEAR(date) = ? AND MONTH(date) = ?`,
          [userId, targetYear, targetMonth]
        );
        const [expenseRecent] = await db.query(
          `SELECT SUM(amount) as total FROM transactions 
           WHERE user_id = ? AND type = 'expense'
             AND YEAR(date) = ? AND MONTH(date) = ?`,
          [userId, targetYear, targetMonth]
        );

        monthlyIncome = parseFloat(incomeRecent[0].total) || 50000;
        monthlyExpenses = parseFloat(expenseRecent[0].total) || 0;
      }
    }

    // Query category breakdown for resolved month
    const [breakdownRows] = await db.query(
      `SELECT c.name as category_name, SUM(t.amount) as total 
       FROM transactions t 
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense'
         AND YEAR(t.date) = ? AND MONTH(t.date) = ?
       GROUP BY c.name`,
      [userId, targetYear, targetMonth]
    );

    // Baseline categories
    const defaultCategories = [
      'Rent', 'Food', 'Electricity Bill', 'Internet Bill', 'Water Bill', 
      'Transport', 'Fuel', 'Shopping', 'Entertainment', 'Medical', 
      'Insurance', 'Investments', 'Savings', 'Others'
    ];
    defaultCategories.forEach(cat => { expenseBreakdown[cat] = 0; });

    breakdownRows.forEach(row => {
      const cat = row.category_name;
      // Map category aggregates to corresponding defaults
      if (cat === 'Food') expenseBreakdown['Food'] = parseFloat(row.total);
      else if (cat === 'Shopping') expenseBreakdown['Shopping'] = parseFloat(row.total);
      else if (cat === 'Transportation') expenseBreakdown['Transport'] = parseFloat(row.total);
      else if (cat === 'Utilities') expenseBreakdown['Electricity Bill'] = parseFloat(row.total);
      else if (cat === 'Entertainment') expenseBreakdown['Entertainment'] = parseFloat(row.total);
      else if (cat === 'Health') expenseBreakdown['Medical'] = parseFloat(row.total);
      else {
        expenseBreakdown['Others'] = (expenseBreakdown['Others'] || 0) + parseFloat(row.total);
      }
    });

    return res.status(200).json({
      monthlyIncome,
      monthlyExpenses,
      expenseBreakdown,
      currency,
      currencySymbol: '₹',
      source: 'transaction_history_fallback'
    });

  } catch (error) {
    console.error('[Prefill Data Error] Failed to resolve details:', error);
    return res.status(500).json({ message: 'Server error retrieving budget pre-fill data.', error: error.message });
  }
};

// Generate customized AI monthly financial plan
exports.generateFinancialPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { monthlyIncome, monthlyExpenses, savingsGoal, financialGoal, monthSelection, expenseBreakdown } = req.body;

    console.log(`[AI Planner Generate] Incoming plan request. User: ${userId}, Month: "${monthSelection}"`);
    console.log('  Payload Summary:', { monthlyIncome, monthlyExpenses, savingsGoal, financialGoal });

    if (!monthlyIncome || !expenseBreakdown) {
      return res.status(400).json({ message: 'Monthly Income and Expense Allocations are required fields.' });
    }

    const income = parseFloat(monthlyIncome);
    const totalAllocated = Object.values(expenseBreakdown).reduce((sum, val) => sum + parseFloat(val || 0), 0);

    // Server-side validation check
    if (totalAllocated > income) {
      const overdrawn = totalAllocated - income;
      console.warn(`[AI Planner Validation Failed] Allocations exceed income by ₹${overdrawn}`);
      return res.status(400).json({
        message: `Your planned expenses exceed your monthly income by ₹${overdrawn.toLocaleString('en-IN')}. Consider reducing spending or increasing your income.`
      });
    }

    // 1. Persist/update allocations in database planner_allocations table
    console.log(`[AI Planner DB] Storing custom allocations in database for user ${userId}, month: "${monthSelection}"...`);
    
    // Clear out old records for the same month selection
    await db.query(
      'DELETE FROM planner_allocations WHERE user_id = ? AND month_selection = ?',
      [userId, monthSelection]
    );

    // Bulk insert new categories allocations
    const insertPromises = Object.keys(expenseBreakdown).map(async (catName) => {
      const val = parseFloat(expenseBreakdown[catName]) || 0;
      if (val > 0) {
        return db.query(
          `INSERT INTO planner_allocations (user_id, month_selection, category_name, amount) 
           VALUES (?, ?, ?, ?)`,
          [userId, monthSelection, catName, val]
        );
      }
    });
    await Promise.all(insertPromises.filter(Boolean));
    console.log('[AI Planner DB] Custom allocations persisted successfully.');

    // 2. Invoke plannerService to call Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    const plan = await plannerService.generatePlan(
      { monthlyIncome, monthlyExpenses: totalAllocated, savingsGoal, financialGoal, monthSelection, expenseBreakdown },
      '₹',
      apiKey
    );

    console.log('[AI Planner Success] Financial plan compiled. Sending response.');
    return res.status(200).json(plan);

  } catch (error) {
    console.error('[AI Planner Error] Plan generation controller failed:', error);
    return res.status(500).json({ message: 'Server error generating customized AI plan.', error: error.message });
  }
};

// Ask AI Chat assistant (context-aware chat)
exports.askAI = async (req, res) => {
  try {
    const userId = req.user.id;
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ message: 'Please provide a valid question.' });
    }

    const symbol = '₹';

    // Fetch recent transactions
    const [transactions] = await db.query(
      `SELECT t.title, t.amount, t.type, DATE_FORMAT(t.date, "%Y-%m-%d") as date,
              c.name as category_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? 
       ORDER BY t.date DESC
       LIMIT 30`,
      [userId]
    );

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const localReply = getLocalChatResponse(question, transactions, symbol);
      return res.status(200).json({ answer: localReply });
    }

    try {
      const txsText = transactions.map(t => `- [${t.date}] [${t.type}] ${t.title}: ${symbol}${t.amount} (${t.category_name})`).join('\n');
      
      const prompt = `
        You are a helpful personal finance AI advisor called AuraAI. Answer the client's query.
        Client's selected currency: INR (Symbol: ${symbol})

        Recent Client Transactions context:
        ${txsText || 'No transaction ledger items logged.'}

        Client Query: "${question}"

        Guidelines:
        1. Formulate a personalized, actionable reply.
        2. Reference items in their transaction history if relevant.
        3. Format your response cleanly using Markdown. Make it concise (under 200 words).
        4. Keep the tone friendly, encouraging, and financially smart.
      `;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawAnswer = data.candidates[0].content.parts[0].text.trim();
      return res.status(200).json({ answer: rawAnswer });
    } catch (apiError) {
      console.warn('[AI Chat] Gemini call failed, resorting to localized backup:', apiError.message);
      const localReply = getLocalChatResponse(question, transactions, symbol);
      return res.status(200).json({ answer: localReply });
    }

  } catch (error) {
    console.error('[AI Chat Error] Failed to process chat session:', error);
    return res.status(500).json({ message: 'Server error processing AI assistant chat.', error: error.message });
  }
};

// Localized rules chat fallback Q&A response generator
function getLocalChatResponse(question, transactions, symbol) {
  const lowerQ = question.toLowerCase();
  
  let totalExpense = 0;
  const categories = {};
  transactions.forEach(t => {
    if (t.type === 'expense') {
      const amt = parseFloat(t.amount);
      totalExpense += amt;
      const cat = t.category_name || 'Other';
      categories[cat] = (categories[cat] || 0) + amt;
    }
  });

  if (lowerQ.includes('save') || lowerQ.includes('more money') || lowerQ.includes('reduce')) {
    const savingsAmount = (totalExpense * 0.15).toFixed(0);
    return `### Actionable Savings Tips 💡\n\nBased on your ledger, your total expenses are **${symbol}${totalExpense.toLocaleString('en-IN')}**. \n\nHere are three primary recommendations to save money immediately:\n1. **Trim Discretionary Leaks**: Try reducing your top category outflows by 15%. This could secure you approximately **${symbol}${savingsAmount}** in additional monthly savings.\n2. **Grocery Prep**: Limit restaurant food delivery apps; batching meals saves average sums.\n3. **Automate**: Establish automated deposit sweeps directly on income days to capture assets before they are spent.`;
  }
  
  if (lowerQ.includes('vacation') || lowerQ.includes('afford') || lowerQ.includes('trip')) {
    const isSafe = totalExpense < 15000;
    return `### Vacation Feasibility Assessment ✈️\n\nYour recent monthly outflows are **${symbol}${totalExpense.toLocaleString('en-IN')}**.\n\n* **Status**: ${isSafe ? 'Feasible' : 'Narrow Margins'}\n* **Advice**: To afford a vacation comfortably without accumulating credit balances, we recommend setting up a dedicated "Travel Goal" savings bucket. Automate **${symbol}2,500** monthly deposits into this bucket for 4 months to establish a debt-free vacation fund.`;
  }

  if (lowerQ.includes('overspending') || lowerQ.includes('where') || lowerQ.includes('largest')) {
    const sorted = Object.keys(categories).map(name => ({ name, amount: categories[name] })).sort((a,b) => b.amount - a.amount);
    if (sorted.length > 0) {
      return `### Overspending Audit 🔍\n\nBased on your recent transactions, your largest expense category is **${sorted[0].name}** totaling **${symbol}${sorted[0].amount.toLocaleString('en-IN')}**.\n\nDiscretionary categories like Shopping or Dining represent primary outflow targets. Try setting category limits for these sections under **Bills & Reminders** to prevent budget overruns.`;
    }
    return `### Overspending Audit 🔍\n\nNo expense transactions are registered in your current ledger. Log your daily outflows in the **Ledger Registry** to trace overspending.`;
  }

  if (lowerQ.includes('invest') || lowerQ.includes('how much')) {
    return `### Recommended Investment Strategy 📈\n\nWe suggest following the **50/30/20 Rule**:\n* **50% Needs**: Essential utilities, groceries, housing.\n* **30% Wants**: Leisure dining, shopping, convenience.\n* **20% Savings & Investments**: Deploy this directly to diversified index portfolios, emergency caches, or mutual funds.\n\nTry starting with an automated contribution of **${symbol}1,000** this week to build compounding interest.`;
  }

  if (lowerQ.includes('budget') || lowerQ.includes('create')) {
    return `### Recommended Budget Limits 📝\n\nHere is a balanced allocation framework you can set up under budgets:\n* **Food & Groceries**: 15% of income\n* **Rent & Utilities**: 35% of income\n* **Discretionary Spending**: 15% of income\n* **Emergency Fund Cache**: 15% of income\n* **Index Portfolios & Savings**: 20% of income\n\nClick **Generate Financial Plan** in the planner dashboard to get category-specific allocation estimates.`;
  }

  return `### Hello! I am AuraAI, your fintech coach 🤖\n\nI can analyze your transactions, budgets, subscriptions, and reminders to optimize your wealth.\n\nHere are some queries you can ask me:\n* *"Where am I overspending?"*\n* *"How can I save more money?"*\n* *"Can I afford a vacation?"*\n* *"How much should I invest?"*`;
}
