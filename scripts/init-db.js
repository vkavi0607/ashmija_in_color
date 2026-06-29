const fs = require('fs');
const path = require('path');
const db = require('../backend/config/database');

async function main() {
  try {
    await db.initDatabase();
    const schema = fs.readFileSync(path.join(__dirname, '..', 'database/schema/mysql_schema.sql'), 'utf8');
    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const pool = db.getPool();
    for (const stmt of statements) {
      if (stmt.toUpperCase().startsWith('CREATE DATABASE') || stmt.toUpperCase().startsWith('USE ')) {
        await pool.query(stmt);
      } else {
        await db.query(stmt);
      }
    }
    console.log('Database schema initialized successfully');
    process.exit(0);
  } catch (err) {
    console.error('Database init failed:', err.message);
    process.exit(1);
  }
}

main();