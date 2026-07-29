const mysql = require('mysql2/promise');
const path = require('path');

// Resolve the .env file location absolutely relative to db.js directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let pool;

async function initializeDatabase() {
  console.log('[Database] Initiating connection pool configuration...');
  console.log(`  Target Host: ${process.env.DB_HOST}`);
  console.log(`  Target User: ${process.env.DB_USER}`);
  console.log(`  Target Database: ${process.env.DB_NAME}`);
  console.log(`  Password Configured: ${process.env.DB_PASSWORD ? `Yes (Length: ${process.env.DB_PASSWORD.length})` : 'No'}`);

  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    console.error('[Database Error] DB_HOST, DB_USER, and DB_NAME must be configured in your .env file.');
    throw new Error('Database environment configuration variables are missing.');
  }

  try {
    // 1. Connect without selecting database to ensure it exists
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
    });

    const dbName = process.env.DB_NAME;
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();

    // 2. Initialize connection pool
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection from pool
    const connCheck = await pool.getConnection();
    connCheck.release();
    console.log('[Database] ✓ Pool connection established successfully.');

    // 3. Create Users Table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(createUsersTable);

    // 4. Safe Alter columns on users table (try-catch prevents crashes if columns exist)
    try {
      await pool.query("ALTER TABLE users ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'");
      console.log('[Database] Checked/added currency column to "users".');
    } catch (err) {
      // Column already exists, ignore
    }
    
    try {
      await pool.query("ALTER TABLE users ALTER COLUMN currency SET DEFAULT 'INR'");
      console.log('[Database] Set currency column default to "INR".');
    } catch (err) {
      // Ignore if syntax error or not supported
    }
    
    try {
      await pool.query("ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE");
      console.log('[Database] Checked/added email_notifications column to "users".');
    } catch (err) {
      // Column already exists, ignore
    }

    // 5. Create Categories Table
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('income', 'expense') NOT NULL,
        color VARCHAR(20) NOT NULL,
        icon VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(createCategoriesTable);

    // 5b. Create Payment Methods Table
    const createPaymentMethodsTable = `
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_payment_method (user_id, name)
      ) ENGINE=InnoDB;
    `;
    await pool.query(createPaymentMethodsTable);

    // Drop old transactions table and temporary tables if they exist
    await pool.query('DROP TABLE IF EXISTS transactions');
    await pool.query('DROP TABLE IF EXISTS income, expenses');

    // 6. Create Transactions Table
    const createTransactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT DEFAULT NULL,
        payment_method_id INT DEFAULT NULL,
        custom_category VARCHAR(100) DEFAULT NULL,
        custom_payment_method VARCHAR(100) DEFAULT NULL,
        type ENUM('income', 'expense') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        time TIME DEFAULT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `;
    await pool.query(createTransactionsTable);

    // 7. Create Budgets Table (goals/limits per category)
    const createBudgetsTable = `
      CREATE TABLE IF NOT EXISTS budgets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        amount_limit DECIMAL(10, 2) NOT NULL,
        period VARCHAR(20) DEFAULT 'monthly',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        UNIQUE KEY unique_user_category (user_id, category_id)
      ) ENGINE=InnoDB;
    `;
    await pool.query(createBudgetsTable);

    // 8. Create Recurring Expenses Table (subscriptions/bills)
    const createRecurringExpensesTable = `
      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
        next_due_date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `;
    await pool.query(createRecurringExpensesTable);

    // 9. Create Bill Reminders Table
    const createRemindersTable = `
      CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(createRemindersTable);

    // 10. Create Planner Allocations Table
    const createPlannerAllocationsTable = `
      CREATE TABLE IF NOT EXISTS planner_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        month_selection VARCHAR(50) NOT NULL,
        category_name VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_month_category (user_id, month_selection, category_name)
      ) ENGINE=InnoDB;
    `;
    await pool.query(createPlannerAllocationsTable);

    // 11. Create Budget Plans Table
    const createBudgetPlansTable = `
      CREATE TABLE IF NOT EXISTS budget_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        month_selection VARCHAR(50) NOT NULL,
        monthly_income DECIMAL(10, 2) NOT NULL,
        current_savings DECIMAL(10, 2) DEFAULT 0,
        savings_goal DECIMAL(10, 2) DEFAULT 0,
        financial_goal VARCHAR(100) DEFAULT 'Save Money',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_month_plan (user_id, month_selection)
      ) ENGINE=InnoDB;
    `;
    await pool.query(createBudgetPlansTable);

    // 12. Create Budget Categories Table
    const createBudgetCategoriesTable = `
      CREATE TABLE IF NOT EXISTS budget_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id INT NOT NULL,
        category_name VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        position INT DEFAULT 0,
        FOREIGN KEY (plan_id) REFERENCES budget_plans(id) ON DELETE CASCADE,
        UNIQUE KEY unique_plan_category (plan_id, category_name)
      ) ENGINE=InnoDB;
    `;
    await pool.query(createBudgetCategoriesTable);

    // 13. Create Planner History Table (stores AI output recommendations)
    const createPlannerHistoryTable = `
      CREATE TABLE IF NOT EXISTS planner_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        health_score INT NOT NULL,
        score_label VARCHAR(50) NOT NULL,
        daily_limit DECIMAL(10, 2) NOT NULL,
        weekly_limits_json TEXT NOT NULL,
        recommendations_json TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        weekly_plan_json TEXT NOT NULL,
        motivation TEXT,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES budget_plans(id) ON DELETE CASCADE,
        UNIQUE KEY unique_plan_history (plan_id)
      ) ENGINE=InnoDB;
    `;
    await pool.query(createPlannerHistoryTable);

    // 14. Create Planner Logs Table
    const createPlannerLogsTable = `
      CREATE TABLE IF NOT EXISTS planner_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        event_name VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(createPlannerLogsTable);

    // 15. Create Planner Settings Table
    const createPlannerSettingsTable = `
      CREATE TABLE IF NOT EXISTS planner_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        risk_appetite VARCHAR(50) DEFAULT 'medium',
        investment_preference VARCHAR(100) DEFAULT 'Mutual Funds',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_planner_settings (user_id)
      ) ENGINE=InnoDB;
    `;
    await pool.query(createPlannerSettingsTable);

    // 18. Create AI Reports Table
    const createAIReportsTable = `
      CREATE TABLE IF NOT EXISTS ai_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        health_score INT NOT NULL,
        report_json TEXT NOT NULL,
        daily_limit DECIMAL(10, 2) NOT NULL,
        weekly_budget_json TEXT NOT NULL,
        savings_plan TEXT,
        investment_suggestions TEXT,
        overspending_areas_json TEXT NOT NULL,
        financial_plan TEXT,
        motivation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(createAIReportsTable);

    // 19. Seed Default Categories if empty
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL');
    if (rows[0].count === 0) {
      console.log('[Database] Seeding default categories...');
      const defaultCategories = [
        ['Food', 'expense', '#6366f1', 'Utensils'],
        ['Rent', 'expense', '#f43f5e', 'Home'],
        ['Grocery', 'expense', '#10b981', 'ShoppingBag'],
        ['Shopping', 'expense', '#a855f7', 'ShoppingBag'],
        ['Transport', 'expense', '#06b6d4', 'Car'],
        ['Fuel', 'expense', '#eab308', 'Zap'],
        ['Electricity Bill', 'expense', '#eab308', 'Lightbulb'],
        ['Water Bill', 'expense', '#06b6d4', 'Droplet'],
        ['Internet', 'expense', '#6366f1', 'Wifi'],
        ['Mobile Recharge', 'expense', '#14b8a6', 'Phone'],
        ['Medical', 'expense', '#ef4444', 'Heart'],
        ['Education', 'expense', '#a855f7', 'BookOpen'],
        ['Entertainment', 'expense', '#d946ef', 'Film'],
        ['Travel', 'expense', '#3b82f6', 'Map'],
        ['EMI', 'expense', '#f43f5e', 'CreditCard'],
        ['Insurance', 'expense', '#10b981', 'Shield'],
        ['Investment', 'expense', '#06b6d4', 'TrendingUp'],
        ['Salary', 'income', '#10b981', 'Briefcase'],
        ['Business', 'income', '#06b6d4', 'TrendingUp'],
        ['Gift', 'income', '#d946ef', 'Gift'],
        ['Others', 'expense', '#64748b', 'Tag'],
        ['Others', 'income', '#64748b', 'Tag']
      ];
      for (const cat of defaultCategories) {
        await pool.query('INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)', cat);
      }
    }

    // 20. Seed Default Payment Methods if empty
    const [pmRows] = await pool.query('SELECT COUNT(*) as count FROM payment_methods WHERE user_id IS NULL');
    if (pmRows[0].count === 0) {
      console.log('[Database] Seeding default payment methods...');
      const defaultPaymentMethods = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Wallet', 'Bank Transfer', 'Cheque', 'Other'];
      for (const pm of defaultPaymentMethods) {
        await pool.query('INSERT INTO payment_methods (name) VALUES (?)', [pm]);
      }
    }
    console.log('[Database] Default categories and payment methods seeded.');

    console.log(`[Database] ✓ MySQL Connected & Initialized database: "${dbName}"`);
  } catch (error) {
    console.error('[Database Error] Failed to initialize database connection:', error.message);
    throw error;
  }
}

module.exports = {
  connectDB: initializeDatabase,
  query: async (sql, params) => {
    if (!pool) {
      throw new Error('[Database Error] Query attempted before database pool initialization was complete.');
    }
    return pool.query(sql, params);
  }
};
