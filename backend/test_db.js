const mysql = require('mysql2/promise');
const path = require('path');

// Load environment variables relative to test_db.js location
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testConnection() {
  console.log('[Test] Initiating MySQL connection check...');
  console.log(`[Test] Loaded Environment:`);
  console.log(`  DB_HOST: ${process.env.DB_HOST}`);
  console.log(`  DB_USER: ${process.env.DB_USER}`);
  console.log(`  DB_NAME: ${process.env.DB_NAME}`);
  console.log(`  DB_PASSWORD Present: ${process.env.DB_PASSWORD ? `Yes (Length: ${process.env.DB_PASSWORD.length})` : 'No'}`);

  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    console.error('\n[Test Failed] DB_HOST, DB_USER, or DB_NAME are not defined in the environment.');
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
    });

    console.log('[Test] ✓ Basic connection successful. MySQL server is online.');
    
    const dbName = process.env.DB_NAME;
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`[Test] ✓ Database "${dbName}" check verified.`);
    
    await connection.changeUser({ database: dbName });
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`[Test] ✓ Switched to database "${dbName}". Tables found:`, tables.map(t => Object.values(t)[0]));

    await connection.end();
    console.log('[Test] ✓ All database verifications completed successfully!');
  } catch (error) {
    console.error('\n[Test Failed] Database connection validation failed.');
    console.error('Error details:', error.message);
    console.error('\nPlease verify that:');
    console.error('1. Your MySQL server is running.');
    console.error('2. The DB_USER and DB_PASSWORD in backend/.env match your local instance credentials.');
  }
}

testConnection();
