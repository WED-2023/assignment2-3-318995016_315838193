var mysql = require('mysql2/promise');
require("dotenv").config();

const config = {
  connectionLimit: 4,
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
};

const pool = mysql.createPool(config);

const connection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log("MySQL pool connected: threadId " + conn.threadId);
    const query = async (sql, binding) => {
      try {
        const [rows, fields] = await conn.query(sql, binding);
        return rows;
      } catch (err) {
        console.error('Error executing query:', err.code, err.message);
        await conn.release(); // Ensure the connection is released on error
        throw err;
      }
    };
    const release = async () => {
      try {
        console.log("MySQL pool released: threadId " + conn.threadId);
        await conn.release();
      } catch (err) {
        console.error('Error releasing connection:', err);
        throw err;
      }
    };
    return { query, release };
  } catch (err) {
    console.error('Error connecting to the database:', err.code, err.message);
    throw err;
  }
};

const query = async (sql, binding) => {
  try {
    const [rows, fields] = await pool.query(sql, binding);
    return rows;
  } catch (err) {
    console.error('Error executing query:', err.code, err.message);
    throw err;
  }
};

module.exports = { pool, connection, query };
