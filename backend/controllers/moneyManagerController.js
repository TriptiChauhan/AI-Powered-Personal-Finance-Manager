const db = require('../config/db');
const plannerService = require('../services/plannerService');

// Category CRUD
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT id, name, type, color, icon, user_id 
       FROM categories 
       WHERE user_id IS NULL OR user_id = ? 
       ORDER BY name ASC`,
      [userId]
    );
    return res.status(200).json({ success: true, categories: rows });
  } catch (error) {
    console.error('[Categories] Fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving categories.' });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type, color = '#6366f1', icon = 'Tag' } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Category name and type (income/expense) are required.' });
    }

    // Check duplicate
    const [existing] = await db.query(
      `SELECT id FROM categories 
       WHERE name = ? AND type = ? AND (user_id IS NULL OR user_id = ?)`,
      [name, type, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Category already exists.' });
    }

    const [result] = await db.query(
      `INSERT INTO categories (user_id, name, type, color, icon) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, name, type, color, icon]
    );

    return res.status(201).json({
      success: true,
      message: 'Custom category created successfully.',
      category: { id: result.insertId, user_id: userId, name, type, color, icon }
    });
  } catch (error) {
    console.error('[Categories] Insert failed:', error);
    return res.status(500).json({ success: false, message: 'Server error creating category.' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const catId = req.params.id;

    // Verify user owns the category
    const [existing] = await db.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [catId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found or unauthorized.' });
    }

    await db.query('DELETE FROM categories WHERE id = ?', [catId]);
    return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('[Categories] Delete failed:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting category.' });
  }
};

// Payment Methods CRUD
exports.getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT id, name, user_id 
       FROM payment_methods 
       WHERE user_id IS NULL OR user_id = ? 
       ORDER BY name ASC`,
      [userId]
    );
    return res.status(200).json({ success: true, paymentMethods: rows });
  } catch (error) {
    console.error('[Payment Methods] Fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving payment methods.' });
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Payment method name is required.' });
    }

    // Check duplicate
    const [existing] = await db.query(
      `SELECT id FROM payment_methods 
       WHERE name = ? AND (user_id IS NULL OR user_id = ?)`,
      [name, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Payment method already exists.' });
    }

    const [result] = await db.query(
      'INSERT INTO payment_methods (user_id, name) VALUES (?, ?)',
      [userId, name]
    );

    return res.status(201).json({
      success: true,
      message: 'Custom payment method created successfully.',
      paymentMethod: { id: result.insertId, user_id: userId, name }
    });
  } catch (error) {
    console.error('[Payment Methods] Insert failed:', error);
    return res.status(500).json({ success: false, message: 'Server error creating payment method.' });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const pmId = req.params.id;

    // Verify user owns
    const [existing] = await db.query(
      'SELECT id FROM payment_methods WHERE id = ? AND user_id = ?',
      [pmId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment method not found or unauthorized.' });
    }

    await db.query('DELETE FROM payment_methods WHERE id = ?', [pmId]);
    return res.status(200).json({ success: true, message: 'Payment method deleted successfully.' });
  } catch (error) {
    console.error('[Payment Methods] Delete failed:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting payment method.' });
  }
};

// Add Inflow (Income)
exports.addIncome = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, categoryId, paymentMethodId, customCategory, customPaymentMethod, date, time, notes } = req.body;

    if (!amount || !date) {
      return res.status(400).json({ success: false, message: 'Amount and date are required.' });
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive.' });
    }

    console.log(`[Money Manager] Logging Income: User ID ${userId}, Amount ₹${val}`);

    const [result] = await db.query(
      `INSERT INTO transactions 
        (user_id, category_id, payment_method_id, custom_category, custom_payment_method, type, amount, date, time, notes) 
       VALUES (?, ?, ?, ?, ?, 'income', ?, ?, ?, ?)`,
      [
        userId,
        categoryId || null,
        paymentMethodId || null,
        customCategory || null,
        customPaymentMethod || null,
        val,
        date,
        time || new Date().toTimeString().split(' ')[0],
        notes || ''
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Income logged successfully.',
      transactionId: result.insertId
    });

  } catch (error) {
    console.error('[Money Manager] Add income failed:', error);
    return res.status(500).json({ success: false, message: 'Server error logging income.', error: error.message });
  }
};

// Add Outflow (Expense)
exports.addExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, categoryId, paymentMethodId, customCategory, customPaymentMethod, date, time, notes } = req.body;

    if (!amount || !date) {
      return res.status(400).json({ success: false, message: 'Amount and date are required.' });
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive.' });
    }

    console.log(`[Money Manager] Logging Expense: User ID ${userId}, Amount ₹${val}`);

    const [result] = await db.query(
      `INSERT INTO transactions 
        (user_id, category_id, payment_method_id, custom_category, custom_payment_method, type, amount, date, time, notes) 
       VALUES (?, ?, ?, ?, ?, 'expense', ?, ?, ?, ?)`,
      [
        userId,
        categoryId || null,
        paymentMethodId || null,
        customCategory || null,
        customPaymentMethod || null,
        val,
        date,
        time || new Date().toTimeString().split(' ')[0],
        notes || ''
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Expense logged successfully.',
      transactionId: result.insertId
    });

  } catch (error) {
    console.error('[Money Manager] Add expense failed:', error);
    return res.status(500).json({ success: false, message: 'Server error logging expense.', error: error.message });
  }
};

// Get Unified Transactions List
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '', // 'income' or 'expense'
      categoryId = '',
      paymentMethodId = '',
      startDate = '',
      endDate = '',
      month = '', // month numeric (1-12)
      year = new Date().getFullYear(),
      amount = '',
      sortBy = 'date',
      sortOrder = 'DESC'
    } = req.query;

    console.log(`[Money Manager] Querying transactions list for User: ${userId}`);

    const pg = parseInt(page);
    const lim = parseInt(limit);
    const offset = (pg - 1) * lim;

    let queryStr = `
      SELECT t.id, t.type, t.amount, DATE_FORMAT(t.date, "%Y-%m-%d") as date, t.time, t.notes,
             t.custom_category, t.custom_payment_method,
             c.name as category_name, c.color as category_color, c.icon as category_icon,
             pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    // Search matches category, notes, payment
    if (search.trim() !== '') {
      queryStr += ' AND (t.notes LIKE ? OR c.name LIKE ? OR pm.name LIKE ? OR t.custom_category LIKE ? OR t.custom_payment_method LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Type filter
    if (type === 'income' || type === 'expense') {
      queryStr += ' AND t.type = ?';
      params.push(type);
    }

    // Category / Source filter
    if (categoryId !== '') {
      queryStr += ' AND (t.category_id = ? OR t.custom_category = ?)';
      params.push(categoryId, categoryId);
    }

    // Payment Method filter
    if (paymentMethodId !== '') {
      queryStr += ' AND (t.payment_method_id = ? OR t.custom_payment_method = ?)';
      params.push(paymentMethodId, paymentMethodId);
    }

    // Date range
    if (startDate !== '' && endDate !== '') {
      queryStr += ' AND t.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate !== '') {
      queryStr += ' AND t.date >= ?';
      params.push(startDate);
    }

    // Month & Year Filter
    if (month !== '') {
      queryStr += ' AND MONTH(t.date) = ? AND YEAR(t.date) = ?';
      params.push(parseInt(month), parseInt(year));
    }

    // Amount search
    if (amount !== '') {
      queryStr += ' AND t.amount = ?';
      params.push(parseFloat(amount));
    }

    // Total Count
    const countQuery = `SELECT COUNT(*) as count FROM (${queryStr}) as total`;
    const [countRows] = await db.query(countQuery, params);
    const totalTransactions = countRows[0]?.count || 0;

    // Sorting
    const validSortFields = ['date', 'amount'];
    const resolvedSortField = validSortFields.includes(sortBy) ? sortBy : 'date';
    const resolvedSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryStr += ` ORDER BY t.${resolvedSortField} ${resolvedSortOrder}, t.id DESC`;

    // Limit/Offset
    queryStr += ' LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const [transactions] = await db.query(queryStr, params);

    return res.status(200).json({
      success: true,
      transactions: transactions.map(t => ({
        ...t,
        amount: parseFloat(t.amount),
        category: t.category_name || t.custom_category || 'Others',
        payment_method: t.payment_method_name || t.custom_payment_method || 'Other'
      })),
      pagination: {
        total: totalTransactions,
        page: pg,
        limit: lim,
        pages: Math.ceil(totalTransactions / lim)
      }
    });

  } catch (error) {
    console.error('[Money Manager] Fetch list failed:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving transaction logs.', error: error.message });
  }
};

// Update Transaction
exports.updateTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const txId = req.params.id;
    const { amount, categoryId, paymentMethodId, customCategory, customPaymentMethod, type, date, time, notes } = req.body;

    if (!amount || !type || !date) {
      return res.status(400).json({ success: false, message: 'Amount, type, and date are required fields.' });
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive.' });
    }

    console.log(`[Money Manager] Updating transaction ID ${txId} for user ${userId}`);

    const [result] = await db.query(
      `UPDATE transactions 
       SET amount = ?, category_id = ?, payment_method_id = ?, custom_category = ?, custom_payment_method = ?,
           type = ?, date = ?, time = ?, notes = ? 
       WHERE id = ? AND user_id = ?`,
      [
        val,
        categoryId || null,
        paymentMethodId || null,
        customCategory || null,
        customPaymentMethod || null,
        type,
        date,
        time || null,
        notes || '',
        txId,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Transaction record not found.' });
    }

    return res.status(200).json({ success: true, message: 'Transaction updated successfully.' });

  } catch (error) {
    console.error('[Money Manager] Update failed:', error);
    return res.status(500).json({ success: false, message: 'Server error updating transaction.', error: error.message });
  }
};

// Delete Transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const txId = req.params.id;

    console.log(`[Money Manager] Deleting transaction ID ${txId} for user ${userId}`);

    const [result] = await db.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [txId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Transaction record not found.' });
    }

    return res.status(200).json({ success: true, message: 'Transaction deleted successfully.' });

  } catch (error) {
    console.error('[Money Manager] Delete failed:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting transaction.', error: error.message });
  }
};

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`[Money Manager Stats] Aggregating dashboard stats for user ${userId}`);

    // Total Income
    const [incRows] = await db.query("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'income'", [userId]);
    const totalIncome = parseFloat(incRows[0].total) || 0;

    // Total Expenses
    const [expRows] = await db.query("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense'", [userId]);
    const totalExpenses = parseFloat(expRows[0].total) || 0;

    const currentBalance = totalIncome - totalExpenses;
    const savings = totalIncome - totalExpenses;

    // Monthly Spending
    const [monthExpRows] = await db.query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = ? AND type = 'expense'
         AND MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())`,
      [userId]
    );
    const monthlySpending = parseFloat(monthExpRows[0].total) || 0;

    // Recent Transactions (Top 5)
    const [recent] = await db.query(
      `SELECT t.id, t.type, t.amount, DATE_FORMAT(t.date, "%Y-%m-%d") as date, t.time, t.notes,
              t.custom_category, t.custom_payment_method,
              c.name as category_name, pm.name as payment_method_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC, t.id DESC
       LIMIT 5`,
      [userId, userId]
    );

    // Pie Chart shares
    const [shares] = await db.query(
      `SELECT COALESCE(c.name, t.custom_category, 'Others') as name, SUM(t.amount) as value 
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense'
       GROUP BY COALESCE(c.name, t.custom_category, 'Others')`,
      [userId]
    );

    // Monthly Trend (6 months)
    const [incomeTrend] = await db.query(
      `SELECT DATE_FORMAT(date, "%b") as month, SUM(amount) as total 
       FROM transactions 
       WHERE user_id = ? AND type = 'income' AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(date, "%b"), MONTH(date)
       ORDER BY MONTH(date) ASC`,
      [userId]
    );
    const [expenseTrend] = await db.query(
      `SELECT DATE_FORMAT(date, "%b") as month, SUM(amount) as total 
       FROM transactions 
       WHERE user_id = ? AND type = 'expense' AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(date, "%b"), MONTH(date)
       ORDER BY MONTH(date) ASC`,
      [userId]
    );

    const monthlyTrendMap = {};
    incomeTrend.forEach(row => {
      monthlyTrendMap[row.month] = { month: row.month, Income: parseFloat(row.total) || 0, Expense: 0 };
    });
    expenseTrend.forEach(row => {
      if (monthlyTrendMap[row.month]) {
        monthlyTrendMap[row.month].Expense = parseFloat(row.total) || 0;
      } else {
        monthlyTrendMap[row.month] = { month: row.month, Income: 0, Expense: parseFloat(row.total) || 0 };
      }
    });

    // Weekly Trend (last 7 days)
    const [weeklyTrend] = await db.query(
      `SELECT DATE_FORMAT(date, "%a") as day, SUM(amount) as total 
       FROM transactions 
       WHERE user_id = ? AND type = 'expense' AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
       GROUP BY DATE_FORMAT(date, "%a"), date
       ORDER BY date ASC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      stats: {
        currentBalance,
        totalIncome,
        totalExpenses,
        savings,
        monthlySpending,
        recentTransactions: recent.map(t => ({
          ...t,
          amount: parseFloat(t.amount),
          category: t.category_name || t.custom_category || 'Others',
          payment_method: t.payment_method_name || t.custom_payment_method || 'Other'
        })),
        categoryBreakdown: shares.map(s => ({ name: s.name, value: parseFloat(s.value) })),
        monthlyTrend: Object.values(monthlyTrendMap),
        weeklyTrend: weeklyTrend.map(w => ({ day: w.day, amount: parseFloat(w.total) || 0 }))
      }
    });

  } catch (error) {
    console.error('[Money Manager Stats] Failed:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving statistics.', error: error.message });
  }
};

// Generate AI Report
exports.generateAIReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log(`[AI Advisor] Generating wealth report for user ${userId}`);

    // Fetch transactions
    const [txs] = await db.query(
      `SELECT t.amount, t.type, t.date, COALESCE(c.name, t.custom_category) as category
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC
       LIMIT 100`,
      [userId]
    );

    const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const categoryTotals = {};
    txs.filter(t => t.type === 'expense').forEach(item => {
      const cat = item.category || 'Others';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(item.amount);
    });

    const aiPlan = await plannerService.generatePlan(
      {
        monthlyIncome: totalIncome || 50000,
        monthlyExpenses: totalExpense,
        savingsGoal: totalIncome * 0.2,
        financialGoal: 'Save Money',
        monthSelection: new Date().toLocaleString('en-US', { month: 'long' }),
        expenseBreakdown: categoryTotals
      },
      '₹',
      apiKey
    );

    return res.status(200).json({ success: true, report: aiPlan });

  } catch (error) {
    console.error('[AI Advisor] Analysis failed:', error);
    return res.status(500).json({ success: false, message: 'Server error compiling AI insights.', error: error.message });
  }
};

// Advisor chat assistant context logic
exports.askAdvisor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ success: false, message: 'Question required.' });
    }

    const symbol = '₹';

    // Fetch recent transaction logs
    const [txs] = await db.query(
      `SELECT t.amount, t.type, t.date, COALESCE(c.name, t.custom_category, 'Others') as category
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC
       LIMIT 30`,
      [userId]
    );

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const formatted = txs.map(t => ({ ...t, category_name: t.category, title: t.category }));
      const localReply = getLocalChatReply(question, formatted, symbol);
      return res.status(200).json({ success: true, answer: localReply });
    }

    try {
      const txText = txs.map(t => `- [${t.date.toISOString().substring(0, 10)}] [${t.type}] ${t.category}: ${symbol}${t.amount}`).join('\n');

      const prompt = `
        You are AuraAI, an expert fintech personal finance coach. Answer the user's query.
        User's selected currency: INR (Symbol: ${symbol})

        Recent User Transactions Logs:
        ${txText || 'No transaction ledger items logged.'}

        User Query: "${question}"

        Guidelines:
        1. Formulate a personalized, actionable reply referencing their transactions details.
        2. Give concrete numbers.
        3. Make it encouraging and financially smart.
        4. Return clean Markdown under 180 words.
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
      return res.status(200).json({ success: true, answer: rawAnswer });

    } catch (apiError) {
      console.warn('[AI Chat] Gemini call failed, invoking heuristics backup:', apiError.message);
      const formatted = txs.map(t => ({ ...t, category_name: t.category, title: t.category }));
      const localReply = getLocalChatReply(question, formatted, symbol);
      return res.status(200).json({ success: true, answer: localReply });
    }

  } catch (error) {
    console.error('[AI Chat] Q&A request failed:', error);
    return res.status(500).json({ success: false, message: 'Server error processing chat query.', error: error.message });
  }
};

// Local heuristics Q&A helper
function getLocalChatReply(question, combinedTxs, symbol) {
  const lowerQ = question.toLowerCase();

  let incomeTotal = 0;
  let expenseTotal = 0;
  const categories = {};

  combinedTxs.forEach(t => {
    const amt = parseFloat(t.amount);
    if (t.type === 'income') {
      incomeTotal += amt;
    } else {
      expenseTotal += amt;
      categories[t.category_name] = (categories[t.category_name] || 0) + amt;
    }
  });

  const remaining = incomeTotal - expenseTotal;

  if (lowerQ.includes('buy a phone') || lowerQ.includes('phone') || lowerQ.includes('buy a laptop')) {
    const isAffordable = remaining > 15000;
    return `### Purchasing Feasibility Analysis 📱\n\n* **Current Balance**: ${symbol}${remaining.toLocaleString('en-IN')}\n* **Status**: ${isAffordable ? 'Feasible' : 'Narrow Margins'}\n* **Advice**: ${
      isAffordable
        ? `Yes, you can afford a phone this month. After spending ₹15,000, you will still have a cushion of ${symbol}${(remaining - 15000).toLocaleString('en-IN')} in reserves.`
        : `We recommend deferring this purchase. Your remaining balance is only ${symbol}${remaining.toLocaleString('en-IN')}. Save an extra ${symbol}5,000 next month to purchase it debt-free.`
    }`;
  }

  if (lowerQ.includes('save') || lowerQ.includes('how much')) {
    const targetSavings = (incomeTotal * 0.2).toFixed(0);
    return `### Recommended Savings Target 🎯\n\n* **Total Income**: ${symbol}${incomeTotal.toLocaleString('en-IN')}\n* **Savings Goal (20%)**: ${symbol}${parseInt(targetSavings).toLocaleString('en-IN')}\n* **Current Savings**: ${symbol}${remaining > 0 ? remaining.toLocaleString('en-IN') : 0}\n\nWe suggest setting up an automated deposit sweep on salary day to capture this 20% margin before discretionary outflows start.`;
  }

  if (lowerQ.includes('overspending') || lowerQ.includes('where')) {
    const sorted = Object.keys(categories).map(n => ({ name: n, amt: categories[n] })).sort((a,b) => b.amt - a.amt);
    if (sorted.length > 0) {
      return `### Overspending Audit 🔍\n\nBased on your entries, your largest expense channel is **${sorted[0].name}** totaling **${symbol}${sorted[0].amt.toLocaleString('en-IN')}**.\n\nTry reducing food delivery outlays and entertainment leaks to secure a larger savings buffer this month.`;
    }
    return `### Overspending Audit 🔍\n\nNo expense entries are logged in your ledger. Log your transactions to enable overspending audits.`;
  }

  if (lowerQ.includes('invest') || lowerQ.includes('where to')) {
    return `### Investment Advice 📈\n\nWe recommend deploying surplus cash in the following split:\n* **60% Diversified Mutual Funds** (Index/SIPs)\n* **25% High-Yield Debt** (PPF, FD)\n* **15% Liquid Emergency Cash Reserves**\n\nStart with a small SIP of **₹1,000/month** this week to build compounding interest.`;
  }

  return `### Hello! I am AuraAI, your wealth advisor 🤖\n\nI can analyze your balances, incomes, and category expenses to optimize your budget.\n\nHere are some questions you can ask me:\n* *"Can I buy a phone this month?"*\n* *"Where am I overspending?"*\n* *"How can I save more money?"*\n* *"Where should I invest?"*`;
}
