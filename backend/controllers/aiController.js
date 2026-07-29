const db = require('../config/db');

// Local rules-based heuristic AI backup for Transactions
function getLocalHeuristics(transactions, username) {
  if (!transactions || transactions.length === 0) {
    return {
      summary: `Welcome ${username} to AuraFinance! Start logging your daily incomes and expenses. Our AI engine will automatically evaluate your financial health score, track your active savings rates, and offer budget tips.`,
      recommendations: [
        { category: 'Overview', type: 'success', message: 'Log your first transactions (e.g. Salary or Groceries) to populate your analytics cards.' },
        { category: 'Rule of Thumb', type: 'info', message: 'Aim for a 50/30/20 budget layout: 50% on Needs, 30% on Wants, and 20% dedicated directly to Savings.' }
      ],
      projectedSavings: 0,
      financialHealthScore: 100,
      spendingHabits: ["No transaction history detected yet."],
      monthlyPrediction: { amount: 0, confidence: "low", message: "Awaiting ledger inputs to establish spending velocity patterns." },
      budgetRecommendations: [],
      savingsSuggestions: [
        { title: "Create emergency fund", potentialSavings: 1000, message: "Try setting aside a small percentage of your salary for emergency liquidity." }
      ],
      financialTips: [
        "Track daily expenses diligently to prevent cash leakages.",
        "Consider automating investment contributions."
      ],
      unnecessarySpending: []
    };
  }

  // Calculate statistics
  let totalIncome = 0;
  let totalExpense = 0;
  const categories = {};
  const transactionItems = [];

  transactions.forEach(t => {
    const amt = parseFloat(t.amount);
    if (t.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
      const cat = t.category_name || 'Other';
      categories[cat] = (categories[cat] || 0) + amt;
      transactionItems.push({ title: t.title, amount: amt, category: cat });
    }
  });

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  const recommendations = [];
  const spendingHabits = [];
  const unnecessarySpending = [];
  const budgetRecommendations = [];
  const savingsSuggestions = [];
  let healthScore = 80;

  // 1. Savings Rate Analysis
  if (totalIncome > 0) {
    if (savingsRate >= 30) {
      recommendations.push({
        category: 'Savings Rate',
        type: 'success',
        message: `Outstanding! Your savings rate is ${savingsRate.toFixed(0)}%. You are building wealth rapidly.`
      });
      healthScore += 15;
      spendingHabits.push("Highly disciplined savings structure with high asset accumulation rate.");
    } else if (savingsRate >= 15) {
      recommendations.push({
        category: 'Savings Rate',
        type: 'info',
        message: `Healthy! You are saving ${savingsRate.toFixed(0)}% of your income.`
      });
      healthScore += 5;
      spendingHabits.push("Standard saving rate behavior. Room to automate small allocations.");
    } else if (savingsRate >= 0) {
      recommendations.push({
        category: 'Savings Rate',
        type: 'warning',
        message: `Low buffer: You are only saving ${savingsRate.toFixed(0)}% of your income.`
      });
      healthScore -= 10;
      spendingHabits.push("Moderate income exhaustion rate. Cash flow margin is narrow.");
    } else {
      recommendations.push({
        category: 'Deficit Warning',
        type: 'warning',
        message: `Cash Flow Alert! You are operating in a net deficit of $${Math.abs(netSavings).toFixed(2)}.`
      });
      healthScore -= 25;
      spendingHabits.push("Aggressive cash outflow exceeding monthly incoming resource inflows.");
    }
  }

  // 2. High Category Expenditures & Budget recommendations
  if (totalExpense > 0) {
    Object.keys(categories).forEach(cat => {
      const catShare = (categories[cat] / totalExpense) * 100;
      if (catShare > 35 && cat !== 'Housing') {
        recommendations.push({
          category: `Concentration: ${cat}`,
          type: 'warning',
          message: `Your spending on "${cat}" represents ${catShare.toFixed(0)}% of your total expenses.`
        });
        healthScore -= 8;
        spendingHabits.push(`High budget concentration in ${cat} channel.`);
        budgetRecommendations.push({
          category: cat,
          currentSpent: parseFloat(categories[cat].toFixed(2)),
          recommendedLimit: parseFloat((categories[cat] * 0.8).toFixed(2))
        });
      } else {
        budgetRecommendations.push({
          category: cat,
          currentSpent: parseFloat(categories[cat].toFixed(2)),
          recommendedLimit: parseFloat((categories[cat] * 0.95).toFixed(2))
        });
      }
    });

    // Detect leaks
    transactionItems.forEach(item => {
      const lowerTitle = item.title.toLowerCase();
      if (lowerTitle.includes('sub') || lowerTitle.includes('netflix') || lowerTitle.includes('spotify') || lowerTitle.includes('prime') || lowerTitle.includes('gym')) {
        unnecessarySpending.push({
          item: item.title,
          amount: item.amount,
          message: "Verify if this recurring membership service is fully utilized."
        });
      }
      if (lowerTitle.includes('starbucks') || lowerTitle.includes('coffee') || lowerTitle.includes('uber') || lowerTitle.includes('dining') || lowerTitle.includes('restaurant')) {
        if (item.amount > 50) {
          unnecessarySpending.push({
            item: item.title,
            amount: item.amount,
            message: "Frequent convenience outflows; cooking or batching rides could shave this down."
          });
        }
      }
    });
  }

  if (spendingHabits.length === 0) {
    spendingHabits.push("Balanced spending categories spread evenly across registered channels.");
  }

  // Cap health score boundaries
  healthScore = Math.max(30, Math.min(100, healthScore));
  const projectedSavings = Math.max(0, parseFloat((totalExpense * 0.15).toFixed(2)));

  // Generate summary
  let summary = `Cash Flow Overview: Income $${totalIncome.toFixed(2)} vs Expenses $${totalExpense.toFixed(2)}. `;
  if (healthScore >= 85) {
    summary += `You have an elite score of ${healthScore}/100. Your budget structures are solid.`;
  } else if (healthScore >= 65) {
    summary += `Your financial diagnostics score is moderate (${healthScore}/100). Automating small saving buckets could prevent leakage.`;
  } else {
    summary += `Your financial health score is critical (${healthScore}/100). We recommend subscription audit and dining reduction.`;
  }

  // Savings Suggestions
  if (totalExpense > 0) {
    savingsSuggestions.push({
      title: "Category Trim",
      potentialSavings: parseFloat((totalExpense * 0.1).toFixed(2)),
      message: "Aim to reduce general discretionary expenses by 10% next month."
    });
  }
  if (unnecessarySpending.length > 0) {
    const totalLeakage = unnecessarySpending.reduce((sum, leak) => sum + leak.amount, 0);
    savingsSuggestions.push({
      title: "Eliminate Convenience Leakage",
      potentialSavings: parseFloat(totalLeakage.toFixed(2)),
      message: `Audit the ${unnecessarySpending.length} convenience outflows detected in your transactions.`
    });
  }

  // Financial Tips
  const financialTips = [
    "Follow the 50/30/20 rule: 50% Needs, 30% Wants, 20% Savings.",
    "Perform a subscription audit every quarter to catch unused fees.",
    "Prioritize paying off any credit outstanding balances above 12% APR first.",
    "Establish 3-6 months of basic living costs in a high-yield liquid account."
  ];

  return {
    summary,
    recommendations,
    projectedSavings,
    financialHealthScore: healthScore,
    spendingHabits,
    monthlyPrediction: {
      amount: parseFloat((totalExpense * 1.05).toFixed(2)),
      confidence: totalExpense > 1000 ? "medium" : "low",
      message: "Forecasted spending is predicted to be slightly higher next month due to standard inflation and discretionary trends."
    },
    budgetRecommendations,
    savingsSuggestions,
    financialTips,
    unnecessarySpending
  };
}

exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;

    // Fetch user's transactions with category names
    const [transactions] = await db.query(
      `SELECT t.title, t.amount, t.type, DATE_FORMAT(t.date, "%Y-%m-%d") as date, t.description,
              c.name as category_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? 
       ORDER BY t.date DESC`,
      [userId]
    );

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Revert to local logic engine
      const localInsights = getLocalHeuristics(transactions, username);
      return res.status(200).json(localInsights);
    }

    // Call Gemini
    try {
      const txsSummary = transactions.slice(0, 50).map(t => `- [${t.date}] [${t.type}] ${t.title}: $${t.amount} (${t.category_name})`).join('\n');
      
      const prompt = `
        You are an elite financial advisor and money coach. Analyze the transaction ledger for user ${username}.
        Total Transactions: ${transactions.length}
        Recent Transactions:
        ${txsSummary || 'No transactions yet.'}

        Based on this ledger data, perform the following tasks:
        1. Write a 2-3 sentence overview evaluating cash flow, savings rate, and overall profile.
        2. Set a financial health score (30 to 100) and calculate projected monthly savings.
        3. Identify 1-3 spending habits (e.g. food delivery frequency, weekend shopping spikes).
        4. Predict next month's outflow expense amount with a confidence rating ("high", "medium", "low") and explanation.
        5. For active expense categories, recommend optimal budget limits based on current consumption.
        6. Offer 2-3 specific savings opportunities.
        7. Audit for unnecessary spending, highlighting subscriptions or excessive convenience charges.
        8. Supply 2-3 smart general financial tips.

        CRITICAL: You must return ONLY a valid JSON string. Do not include markdown formatting (like \`\`\`json).
        Format the response to match this JSON schema exactly:
        {
          "summary": "Short cash flow analysis overview.",
          "financialHealthScore": 85,
          "projectedSavings": 120.00,
          "spendingHabits": ["Habit string 1", "Habit string 2"],
          "monthlyPrediction": { "amount": 15400.00, "confidence": "high|medium|low", "message": "Reasoning details" },
          "budgetRecommendations": [
            { "category": "CategoryName", "currentSpent": 8000.00, "recommendedLimit": 7000.00 }
          ],
          "savingsSuggestions": [
            { "title": "Trim streaming", "potentialSavings": 250.00, "message": "Action details" }
          ],
          "financialTips": ["General Tip 1", "General Tip 2"],
          "unnecessarySpending": [
            { "item": "Unused service fee", "amount": 99.00, "message": "Details" }
          ],
          "recommendations": [
            { "category": "General Category", "type": "warning|info|success", "message": "Quick insight tip." }
          ]
        }
      `;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text.trim();
      
      let cleanText = rawText;
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      }

      const aiResponse = JSON.parse(cleanText);
      return res.status(200).json(aiResponse);
    } catch (apiError) {
      console.warn('[AI Service] Gemini API failed, using fallback engine:', apiError.message);
      const localInsights = getLocalHeuristics(transactions, username);
      return res.status(200).json({
        ...localInsights,
        apiStatus: 'fallback',
        apiError: apiError.message
      });
    }

  } catch (error) {
    console.error('AI Insights endpoint error:', error);
    return res.status(500).json({ message: 'Server error processing AI insights.', error: error.message });
  }
};
