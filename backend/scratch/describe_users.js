const db = require('../config/db');

async function checkSchema() {
  try {
    await db.connectDB();
    const [columns] = await db.query('DESCRIBE users');
    console.log('[Schema] "users" table columns:');
    console.log(columns.map(c => ({
      Field: c.Field,
      Type: c.Type,
      Null: c.Null,
      Key: c.Key,
      Default: c.Default,
      Extra: c.Extra
    })));
    process.exit(0);
  } catch (error) {
    console.error('[Schema Error] Failed to describe users table:', error.message);
    process.exit(1);
  }
}

checkSchema();
