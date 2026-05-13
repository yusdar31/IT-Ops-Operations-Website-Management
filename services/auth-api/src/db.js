'use strict';

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  port:             process.env.DB_PORT     || 3306,
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || 'password',
  database:         process.env.DB_NAME     || 'it_ops_hub',
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  timezone:         'Z',
});

async function initDB() {
  const conn = await pool.getConnection();
  try {
    // Ensure users table exists (auth-api owns this table)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        name          VARCHAR(100)  NOT NULL,
        email         VARCHAR(150)  NOT NULL UNIQUE,
        password_hash VARCHAR(255)  NOT NULL,
        role          ENUM('admin','technician','viewer') NOT NULL DEFAULT 'viewer',
        department    VARCHAR(100),
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Seed default admin if not present
    const [rows] = await conn.query('SELECT id FROM users WHERE email = ?', ['admin@it-ops-hub.local']);
    if (rows.length === 0) {
      const hash = await bcrypt.hash('Admin@123!', 12);
      await conn.query(
        'INSERT INTO users (name, email, password_hash, role, department) VALUES (?,?,?,?,?)',
        ['System Administrator', 'admin@it-ops-hub.local', hash, 'admin', 'IT Department']
      );
      console.log('✅ Default admin created  →  admin@it-ops-hub.local / Admin@123!');
    }

    console.log('✅ Auth API DB ready');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
