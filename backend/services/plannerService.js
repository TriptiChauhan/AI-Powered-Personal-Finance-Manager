// Helper to format currency in Indian style
function formatIndianCurrency(amount) {
  const value = parseFloat(amount || 0);
  const formatted = value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return `₹${formatted}`;
}

// Local rules-based heuristics fallback generator localized for India
function getLocalPlannerHeuristics(inputPayload) {
  const {
    monthlyIncome,
    monthlyExpenses,
    savingsGoal = 0,
    financialGoal = 'Save Money',
    monthSelection = 'Current Month',
    expenseBreakdown = {}
  } = inputPayload;

  const income = parseFloat(monthlyIncome) || 50000;
  const expenses = parseFloat(monthlyExpenses) || 32000;
  const targetSavings = parseFloat(savingsGoal) || 0;

  const netSavings = income - expenses;
  const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

  // 1. Health score
  let healthScore = 75;
  if (savingsRate >= 20) healthScore += 10;
  else if (savingsRate < 10) healthScore -= 10;
  
  if (netSavings >= targetSavings && targetSavings > 0) healthScore += 10;
  else if (netSavings < targetSavings && targetSavings > 0) healthScore -= 15;

  if (expenses > income) healthScore -= 20;

  healthScore = Math.max(30, Math.min(100, healthScore));

  let scoreLabel = "Needs Attention";
  if (healthScore >= 85) scoreLabel = "Excellent";
  else if (healthScore >= 70) scoreLabel = "Healthy";
  else if (healthScore >= 50) scoreLabel = "Moderate";

  // 2. Monthly Budget allocations
  const recommendedBudget = {};
  
  // Re-allocate custom categories
  Object.keys(expenseBreakdown).forEach(cat => {
    const userVal = parseFloat(expenseBreakdown[cat]) || 0;
    if (['Shopping', 'Entertainment', 'Others'].includes(cat)) {
      recommendedBudget[cat] = Math.round(userVal * 0.9); // Recommends a 10% trim
    } else {
      recommendedBudget[cat] = Math.round(userVal);
    }
  });

  // Calculate default investment/savings columns
  const totalAllocated = Object.values(recommendedBudget).reduce((a, b) => a + b, 0);
  const remainingCushion = Math.max(0, income - totalAllocated);

  recommendedBudget['Emergency Fund'] = Math.round(remainingCushion * 0.3);
  recommendedBudget['Savings'] = Math.round(remainingCushion * 0.4);
  recommendedBudget['Investments'] = Math.round(remainingCushion * 0.3);

  // 3. Recommended Limits
  const discretionaryAmt = Math.max(0, income - (recommendedBudget['Bills'] || 0) - recommendedBudget['Emergency Fund'] - recommendedBudget['Savings'] - recommendedBudget['Investments']);
  const dailyLimit = Math.max(500, Math.round(discretionaryAmt / 30));
  const weeklyLimit = Math.round(dailyLimit * 7);

  const weeklyLimits = {
    "Week 1": weeklyLimit,
    "Week 2": weeklyLimit,
    "Week 3": weeklyLimit,
    "Week 4": weeklyLimit
  };

  // 4. Month Timeline Planner
  const weeklyPlan = [
    {
      week: "Week 1",
      tasks: [
        "Settle utility and electricity bills early to avoid late fees.",
        "Grocery shopping; purchase staples in bulk to leverage local store discounts.",
        `Save ${formatIndianCurrency(recommendedBudget['Savings'] / 2)} immediately.`
      ]
    },
    {
      week: "Week 2",
      tasks: [
        "Trim weekend leisure and restaurant delivery outflows.",
        `Invest ${formatIndianCurrency(recommendedBudget['Investments'] / 2)} in diversified SIPs or ELSS.`,
        "Keep discretionary shopping spending under control."
      ]
    },
    {
      week: "Week 3",
      tasks: [
        "Audit mid-month ledger logs and verify category budget thresholds.",
        `Deposit ${formatIndianCurrency(recommendedBudget['Savings'] / 2)} directly into high-yield savings.`,
        "Audit subscriptions and convienence charges."
      ]
    },
    {
      week: "Week 4",
      tasks: [
        "Examine category limits and identify leakages.",
        `Transfer remaining surplus of ${formatIndianCurrency(remainingCushion * 0.1)} to emergency cash reserves.`,
        "Outline budget limits config for the next month."
      ]
    }
  ];

  // 5. Actionable Recommendations (at least 10)
  const recommendations = [
    "Adopt the 50/30/20 budget framework: 50% Needs, 30% Wants, 20% Savings.",
    `Restrict discretionary outlays to under ${formatIndianCurrency(dailyLimit)}/day.`,
    "Audit recurring streaming services, OTT subscriptions, and portal bills.",
    "Pay off high-interest debt structures carrying rates above 10% first.",
    "Automate SIP transfers to index mutual funds on salary credit day.",
    "Shop at local mandis/grocers to trim dining out delivery leaks.",
    "Wait 48 hours before committing to non-essential shopping items.",
    `Work towards compiling a liquid emergency fund of ${formatIndianCurrency(income * 3)}.`,
    "Consider tax-saving investments like PPF, NPS, or ELSS to trim outflows.",
    "Set alerts on your banking app for transactions exceeding ₹2,000."
  ];

  // 6. Warnings
  const warnings = [];
  if (savingsRate < 20) {
    warnings.push("Savings are below 20%. Try cutting back on wants to build a larger cushion.");
  }
  const foodAmt = parseFloat(expenseBreakdown['Food']) || 0;
  if (foodAmt > income * 0.15) {
    warnings.push("Food and grocery outlays exceed the recommended 15% income margin.");
  }
  const shoppingAmt = parseFloat(expenseBreakdown['Shopping']) || 0;
  if (shoppingAmt > income * 0.18) {
    warnings.push(`Shopping exceeds 18% of your income. Consider setting strict discretionary limits.`);
  }
  if (expenses > income) {
    warnings.push("CRITICAL WARNING: Planned allocations exceed monthly income buffers. Action required.");
  }
  if (warnings.length === 0) {
    warnings.push("Monthly outlays are currently aligned with income buffers.");
  }

  // 7. Motivation
  const motivation = `You're on the right track. By following this localized planner, you can save approximately ${formatIndianCurrency(remainingCushion + targetSavings)} this month for your "${financialGoal}" goal!`;

  return {
    financialHealthScore: healthScore,
    scoreLabel,
    monthlyBudget: recommendedBudget,
    weeklyPlan,
    dailyLimit,
    weeklyLimits,
    recommendations,
    warnings,
    motivation
  };
}

// Generate plan from Gemini
exports.generatePlan = async (inputPayload, currencySymbol, apiKey) => {
  const symbol = '₹'; // Lock to Indian Rupee
  
  if (!apiKey) {
    console.log('[AI Service] Gemini API key absent, running localized Indian heuristics engine.');
    return getLocalPlannerHeuristics(inputPayload);
  }

  try {
    const prompt = `
      You are an expert Indian personal wealth manager and financial planner. Generate a premium Monthly Financial Plan for the month of ${inputPayload.monthSelection || 'Current Month'}.
      
      Client Details:
      - Monthly Income: ${symbol}${inputPayload.monthlyIncome}
      - Estimated Monthly Expenses: ${symbol}${inputPayload.monthlyExpenses}
      - Savings Goal: ${symbol}${inputPayload.savingsGoal || 0}
      - Target Financial Goal: ${inputPayload.financialGoal || 'Save Money'}
      - User-Planned Expense Allocations:
      ${JSON.stringify(inputPayload.expenseBreakdown || {}, null, 2)}

      Analyze the client parameters and formulate:
      1. A financial health score out of 100 based on savings ratio, goals, and expenditures. Add a score label (e.g. Excellent, Healthy, Moderate, Needs Attention).
      2. A monthly budget allocation plan. Distribute their monthly income across key categories (Food, Bills, Shopping, Transport, Entertainment, Emergency Fund, Savings, Investments) in currency symbol ${symbol}. Recommmend specific Indian wealth instruments like Mutual Funds, ELSS, PPF, FD, or NPS for the savings and investment chunks.
      3. A month-wise planner split into Week 1, Week 2, Week 3, and Week 4, listing specific actionable tasks (at least 2-3 checklist items per week). Include localized Indian tasks (e.g., settling utility bills like electricity/internet early, setting up mutual fund SIPs, auditing local merchant transactions).
      4. A recommended daily discretionary spending limit.
      5. Recommended weekly spending limits for weeks 1, 2, 3, and 4 (must use Indian formatting e.g. ₹7,500).
      6. At least 10 personalized, practical recommendations. Focus on Indian lifestyle tweaks (avoiding frequent high-cost Zomato/Swiggy orders, using public transport, planning tax deductions via ELSS/PPF, monitoring credit card usage).
      7. Smart warnings alerting them to category budget breaches, deficits, or low saving indices.
      8. A short, encouraging motivational message referencing their target goal "${inputPayload.financialGoal}".

      CRITICAL: You must return ONLY a valid JSON string. Do not include markdown code block formatting (such as \`\`\`json). The response must match this schema exactly:
      {
        "financialHealthScore": 82,
        "scoreLabel": "Healthy",
        "monthlyBudget": {
          "Food": 8000,
          "Bills": 6000,
          "Shopping": 4000,
          "Transport": 3000,
          "Entertainment": 2000,
          "Emergency Fund": 5000,
          "Savings": 10000,
          "Investments": 12000
        },
        "weeklyPlan": [
          { "week": "Week 1", "tasks": ["Pay electricity bill", "Grocery shopping", "Save money"] },
          { "week": "Week 2", "tasks": ["Reduce restaurant spending", "Invest money"] },
          { "week": "Week 3", "tasks": ["Review expenses", "Save money"] },
          { "week": "Week 4", "tasks": ["Prepare next month's budget", "Analyze spending"] }
        ],
        "dailyLimit": 1250,
        "weeklyLimits": {
          "Week 1": 7500,
          "Week 2": 7500,
          "Week 3": 7500,
          "Week 4": 7500
        },
        "recommendations": [
          "Reduce online shopping by 20%.",
          "Increase monthly savings by target amount."
        ],
        "warnings": [
          "Food expenses are higher than recommended.",
          "Savings are below 20%."
        ],
        "motivation": "You're on the right track..."
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
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text.trim();
    
    let cleanText = rawText;
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(cleanText);
  } catch (error) {
    console.warn('[AI Service] Gemini call failed, invoking localized Indian heuristics backup:', error.message);
    return getLocalPlannerHeuristics(inputPayload);
  }
};
