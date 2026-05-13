'use strict';

const mysql = require('mysql2/promise');

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
    await conn.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        hostname      VARCHAR(100)  NOT NULL,
        ip_address    VARCHAR(45)   NOT NULL,
        type          VARCHAR(50)   NOT NULL,
        department    VARCHAR(100),
        location      VARCHAR(150),
        status        ENUM('active','inactive','maintenance') NOT NULL DEFAULT 'active',
        serial_number VARCHAR(100),
        purchase_date DATE,
        notes         TEXT,
        created_by    INT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status     (status),
        INDEX idx_type       (type),
        INDEX idx_department (department)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Asset API DB ready');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
