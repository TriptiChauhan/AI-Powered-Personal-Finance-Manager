const db = require('../config/db');
const plannerService = require('../services/plannerService');

// Create/Generate monthly budget plan
exports.createPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      monthlyIncome,
      currentSavings = 0,
      savingsGoal = 0,
      financialGoal = 'Save Money',
      monthSelection,
      expenseBreakdown = [] // Array of { name, amount, position }
    } = req.body;

    console.log(`[Budget Planner] Creating plan for user: ${userId}, Month: "${monthSelection}"`);

    if (!monthlyIncome || !monthSelection || !expenseBreakdown || expenseBreakdown.length === 0) {
      return res.status(400).json({ success: false, message: 'Monthly Income, Month, and budget allocations are required.' });
    }

    const income = parseFloat(monthlyIncome);
    const totalAllocated = expenseBreakdown.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    // Validation
    if (totalAllocated > income) {
      return res.status(400).json({
        success: false,
        message: `Your planned expenses exceed your monthly income by ₹${(totalAllocated - income).toLocaleString('en-IN')}. Consider reducing spending.`
      });
    }

    // 1. Check/Delete old budget plans for this user and month
    await db.query(
      'DELETE FROM budget_plans WHERE user_id = ? AND month_selection = ?',
      [userId, monthSelection]
    );

    // 2. Insert new budget plan
    const [planResult] = await db.query(
      `INSERT INTO budget_plans 
        (user_id, month_selection, monthly_income, current_savings, savings_goal, financial_goal) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, monthSelection, income, parseFloat(currentSavings), parseFloat(savingsGoal), financialGoal]
    );
    const planId = planResult.insertId;
    console.log(`[Budget Planner DB] Budget plan row created. ID: ${planId}`);

    // 3. Insert budget categories allocations
    const insertCatPromises = expenseBreakdown.map((item, idx) => {
      return db.query(
        `INSERT INTO budget_categories (plan_id, category_name, amount, position) 
         VALUES (?, ?, ?, ?)`,
        [planId, item.name, parseFloat(item.amount || 0), item.position || idx]
      );
    });
    await Promise.all(insertCatPromises);
    console.log('[Budget Planner DB] Budget categories items persisted successfully.');

    // 4. Map breakdowns for prompt service
    const promptBreakdown = {};
    expenseBreakdown.forEach(item => {
      promptBreakdown[item.name] = parseFloat(item.amount || 0);
    });

    // 5. Invoke AI Planner Service (calls Gemini or localized fallback heuristics)
    const apiKey = process.env.GEMINI_API_KEY;
    const aiPlan = await plannerService.generatePlan(
      { monthlyIncome: income, monthlyExpenses: totalAllocated, savingsGoal, financialGoal, monthSelection, expenseBreakdown: promptBreakdown },
      '₹',
      apiKey
    );

    // 6. Cache AI advice in planner_history
    await db.query(
      `INSERT INTO planner_history 
        (user_id, plan_id, health_score, score_label, daily_limit, weekly_limits_json, 
         recommendations_json, warnings_json, weekly_plan_json, motivation, summary) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        planId,
        aiPlan.financialHealthScore,
        aiPlan.scoreLabel || 'Healthy',
        aiPlan.dailyLimit,
        JSON.stringify(aiPlan.weeklyLimits || {}),
        JSON.stringify(aiPlan.recommendations || []),
        JSON.stringify(aiPlan.warnings || []),
        JSON.stringify(aiPlan.weeklyPlan || []),
        aiPlan.motivation || '',
        aiPlan.summary || ''
      ]
    );
    console.log('[Budget Planner DB] AI planner history record created.');

    // 7. Log Event
    await db.query(
      'INSERT INTO planner_logs (user_id, event_name, status, message) VALUES (?, ?, ?, ?)',
      [userId, 'PLAN_GENERATION', 'SUCCESS', `Budget plan generated for ${monthSelection}`]
    );

    return res.status(201).json({
      success: true,
      message: 'Budget plan and AI recommendations generated successfully.',
      planId,
      planDetails: {
        id: planId,
        monthSelection,
        monthlyIncome: income,
        currentSavings,
        savingsGoal,
        financialGoal,
        totalAllocated,
        remainingIncome: income - totalAllocated,
        ai: aiPlan
      }
    });

  } catch (error) {
    console.error('[Budget Planner Error] Failed to generate plan:', error);
    // Log Failure
    try {
      await db.query(
        'INSERT INTO planner_logs (user_id, event_name, status, message) VALUES (?, ?, ?, ?)',
        [req.user?.id || 0, 'PLAN_GENERATION', 'FAILED', error.message]
      );
    } catch (dbErr) {}

    return res.status(500).json({ success: false, message: 'Server error generating budget plan.', error: error.message });
  }
};

// Retrieve user's budget plans list
exports.getPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search = '' } = req.query;

    console.log(`[Budget Planner] Fetching budget plans list for User: ${userId}, Search query: "${search}"`);

    let queryStr = `
      SELECT p.id, p.month_selection, p.monthly_income, p.savings_goal, p.financial_goal, p.created_at,
             h.health_score, h.score_label,
             (SELECT SUM(amount) FROM budget_categories WHERE plan_id = p.id) as total_allocated
      FROM budget_plans p
      LEFT JOIN planner_history h ON p.id = h.plan_id
      WHERE p.user_id = ?
    `;
    const params = [userId];

    if (search.trim() !== '') {
      queryStr += ' AND p.month_selection LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    queryStr += ' ORDER BY p.created_at DESC';

    const [plans] = await db.query(queryStr, params);

    return res.status(200).json({
      success: true,
      plans: plans.map(p => ({
        ...p,
        total_allocated: parseFloat(p.total_allocated) || 0,
        remaining_income: parseFloat(p.monthly_income) - (parseFloat(p.total_allocated) || 0)
      }))
    });

  } catch (error) {
    console.error('[Budget Planner Error] Failed to retrieve plans list:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving plans.', error: error.message });
  }
};

// Retrieve a specific plan details
exports.getPlanDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const planId = req.params.id;

    console.log(`[Budget Planner] Fetching details for Plan ID: ${planId}, User: ${userId}`);

    // Fetch plan metadata
    const [plans] = await db.query(
      'SELECT * FROM budget_plans WHERE id = ? AND user_id = ?',
      [planId, userId]
    );

    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Budget plan not found.' });
    }

    const plan = plans[0];

    // Fetch allocations ordered by position index
    const [categories] = await db.query(
      'SELECT category_name as name, amount, position FROM budget_categories WHERE plan_id = ? ORDER BY position ASC',
      [planId]
    );

    // Fetch AI details
    const [histories] = await db.query(
      'SELECT * FROM planner_history WHERE plan_id = ?',
      [planId]
    );

    let ai = null;
    if (histories.length > 0) {
      const h = histories[0];
      ai = {
        financialHealthScore: h.health_score,
        scoreLabel: h.score_label,
        dailyLimit: parseFloat(h.daily_limit),
        weeklyLimits: JSON.parse(h.weekly_limits_json || '{}'),
        recommendations: JSON.parse(h.recommendations_json || '[]'),
        warnings: JSON.parse(h.warnings_json || '[]'),
        weeklyPlan: JSON.parse(h.weekly_plan_json || '[]'),
        motivation: h.motivation,
        summary: h.summary
      };
    }

    const totalAllocated = categories.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    return res.status(200).json({
      success: true,
      plan: {
        id: plan.id,
        monthSelection: plan.month_selection,
        monthlyIncome: parseFloat(plan.monthly_income),
        currentSavings: parseFloat(plan.current_savings),
        savingsGoal: parseFloat(plan.savings_goal),
        financialGoal: plan.financial_goal,
        totalAllocated,
        remainingIncome: parseFloat(plan.monthly_income) - totalAllocated,
        categories,
        ai
      }
    });

  } catch (error) {
    console.error('[Budget Planner Error] Failed to retrieve plan details:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving plan details.', error: error.message });
  }
};

// Delete budget plan
exports.deletePlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const planId = req.params.id;

    console.log(`[Budget Planner] Deleting Budget Plan ID: ${planId}, User: ${userId}`);

    // Verify ownership
    const [plans] = await db.query(
      'SELECT id FROM budget_plans WHERE id = ? AND user_id = ?',
      [planId, userId]
    );

    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Budget plan not found.' });
    }

    // Execute deletion (related items auto-delete via foreign key ON DELETE CASCADE)
    await db.query('DELETE FROM budget_plans WHERE id = ?', [planId]);

    // Log deletion
    await db.query(
      'INSERT INTO planner_logs (user_id, event_name, status, message) VALUES (?, ?, ?, ?)',
      [userId, 'PLAN_DELETION', 'SUCCESS', `Budget plan ID ${planId} deleted.`]
    );

    return res.status(200).json({ success: true, message: 'Budget plan deleted successfully.' });

  } catch (error) {
    console.error('[Budget Planner Error] Deletion failed:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting plan.', error: error.message });
  }
};

// Compare allocations between two budget plans
exports.comparePlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id1, id2 } = req.params;

    console.log(`[Budget Planner] Comparing Plan ${id1} with Plan ${id2} for User ${userId}`);

    // Fetch Plan 1 allocations
    const [p1MetaData] = await db.query('SELECT month_selection, monthly_income FROM budget_plans WHERE id = ? AND user_id = ?', [id1, userId]);
    const [p2MetaData] = await db.query('SELECT month_selection, monthly_income FROM budget_plans WHERE id = ? AND user_id = ?', [id2, userId]);

    if (p1MetaData.length === 0 || p2MetaData.length === 0) {
      return res.status(404).json({ success: false, message: 'One or both of the target plans was not found.' });
    }

    const [c1] = await db.query('SELECT category_name as name, amount FROM budget_categories WHERE plan_id = ?', [id1]);
    const [c2] = await db.query('SELECT category_name as name, amount FROM budget_categories WHERE plan_id = ?', [id2]);

    const m1 = p1MetaData[0].month_selection;
    const m2 = p2MetaData[0].month_selection;

    const allocations = {};

    // Map Category allocations
    c1.forEach(item => {
      allocations[item.name] = {
        name: item.name,
        p1Amount: parseFloat(item.amount) || 0,
        p2Amount: 0,
        diff: -parseFloat(item.amount) || 0
      };
    });

    c2.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      if (allocations[item.name]) {
        allocations[item.name].p2Amount = amt;
        allocations[item.name].diff = amt - allocations[item.name].p1Amount;
      } else {
        allocations[item.name] = {
          name: item.name,
          p1Amount: 0,
          p2Amount: amt,
          diff: amt
        };
      }
    });

    return res.status(200).json({
      success: true,
      comparison: {
        plan1: { id: id1, month: m1, income: parseFloat(p1MetaData[0].monthly_income) },
        plan2: { id: id2, month: m2, income: parseFloat(p2MetaData[0].monthly_income) },
        categories: Object.values(allocations)
      }
    });

  } catch (error) {
    console.error('[Budget Planner Error] Comparison query failed:', error);
    return res.status(500).json({ success: false, message: 'Server error comparing budget plans.', error: error.message });
  }
};
