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

// Redis client for publishing notification events
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true,
});

redis.on('error', (err) => console.warn('Redis connection warning:', err.message));

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        ticket_number  VARCHAR(20)   NOT NULL UNIQUE,
        title          VARCHAR(200)  NOT NULL,
        description    TEXT          NOT NULL,
        category       ENUM('incident','service_request','problem','change') NOT NULL DEFAULT 'incident',
        priority       ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
        status         ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
        asset_id       INT           NULL,
        reporter_id    INT           NOT NULL,
        assignee_id    INT           NULL,
        resolved_at    TIMESTAMP     NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status   (status),
        INDEX idx_priority (priority),
        INDEX idx_assignee (assignee_id),
        INDEX idx_reporter (reporter_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id  INT  NOT NULL,
        user_id    INT  NOT NULL,
        content    TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticket (ticket_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        user_id      INT          NOT NULL,
        type         VARCHAR(50)  NOT NULL,
        message      TEXT         NOT NULL,
        reference_id INT          NULL,
        is_read      BOOLEAN DEFAULT FALSE,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_unread (user_id, is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Connect to Redis (non-blocking — notifications still work via DB only if Redis is down)
    await redis.connect().catch(() => console.warn('⚠️  Redis unavailable — notifications queued to DB only'));

    console.log('✅ Ticket API DB ready');
  } finally {
    conn.release();
  }
}

module.exports = { pool, redis, initDB };
