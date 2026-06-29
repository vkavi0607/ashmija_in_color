/**
 * database.js - MySQL Database Configuration
 * 
 * 🔴 IMPORTANT: Fill in your MySQL credentials below
 * 
 * You need:
 * 1. A MySQL server (local or cloud like Aiven, PlanetScale, AWS RDS, etc.)
 * 2. Create a database named 'ashmija_in_color' (or your preferred name)
 * 3. Run the schema.sql file to create tables
 * 4. Update the config below with your credentials
 */

const mysql = require('mysql2/promise');

// 🔴 FILL IN YOUR MYSQL CREDENTIALS HERE:
const DB_CONFIG = {
  host: '127.0.0.1',         // Your MySQL host (e.g., 'localhost' or IP)
  port: 3306,                // MySQL port (default: 3306)
  user: 'root',              // 🔴 Your MySQL username
  password: 'shk@ags2313', // 🔴 Your MySQL password
  database: 'ashmija_in_color', // Database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

/**
 * Initialize the MySQL connection pool
 */
function initDatabase() {
  pool = mysql.createPool(DB_CONFIG);
  console.log('[DB] MySQL connection pool created');
  return pool;
}

/**
 * Get the database connection pool
 */
function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Execute a query with parameters
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

/**
 * Execute a query and return the first row
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Insert a row and return the insert ID
 */
async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${table}\` (${keys.map(k => '`' + k + '`').join(', ')}) VALUES (${placeholders})`;
  const p = getPool();
  const [result] = await p.execute(sql, values);
  return result.insertId;
}

/**
 * Update rows in a table
 */
async function update(table, data, whereClause, whereParams = []) {
  const setClause = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
  const values = [...Object.values(data), ...whereParams];
  const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`;
  const p = getPool();
  const [result] = await p.execute(sql, values);
  return result.affectedRows;
}

/**
 * Delete rows from a table
 */
async function remove(table, whereClause, whereParams = []) {
  const sql = `DELETE FROM \`${table}\` WHERE ${whereClause}`;
  const p = getPool();
  const [result] = await p.execute(sql, whereParams);
  return result.affectedRows;
}

/**
 * Get current timestamp for MySQL
 */
function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = {
  initDatabase,
  getPool,
  query,
  queryOne,
  insert,
  update,
  remove,
  now
};