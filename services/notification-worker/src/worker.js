'use strict';

const Redis  = require('ioredis');
const mysql  = require('mysql2/promise');
const { sendEmail } = require('./emailSender');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME     || 'it_ops_hub',
  waitForConnections: true,
  connectionLimit: 5,
  timezone: 'Z',
});

redis.on('connect', () => console.log('🔗 Redis connected'));
redis.on('error',   (err) => console.error('Redis error:', err.message));

// ── Save notification to DB ───────────────────────────────
async function saveNotification({ type, userId, ticketId, message }) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, message, reference_id) VALUES (?,?,?,?)',
    [userId, type, message, ticketId || null]
  );
}

// ── Get user details for email ────────────────────────────
async function getUserEmail(userId) {
  const [rows] = await pool.query('SELECT name, email FROM users WHERE id = ? AND is_active = 1', [userId]);
  return rows[0] || null;
}

// ── Process single notification event ────────────────────
async function processEvent(rawData) {
  let payload;
  try {
    payload = JSON.parse(rawData);
  } catch {
    console.error('Invalid JSON in queue, skipping:', rawData);
    return;
  }

  const { type, userId, ticketId, ticketNumber, message, reporterName } = payload;
  console.log(`📨 Processing [${type}] for user ${userId} — ticket ${ticketNumber}`);

  // 1. Save in-app notification
  await saveNotification({ type, userId, ticketId, message });

  // 2. Send email (non-blocking, best-effort)
  if (process.env.SES_FROM_EMAIL) {
    const user = await getUserEmail(userId);
    if (user) {
      await sendEmail({
        to:       user.email,
        toName:   user.name,
        subject:  getEmailSubject(type, ticketNumber),
        html:     getEmailHTML(type, user.name, ticketNumber, message, reporterName),
      }).catch(err => console.error('SES send failed (non-fatal):', err.message));
    }
  }
}

function getEmailSubject(type, ticketNumber) {
  const subjects = {
    'ticket.created':   `[IT Ops Hub] New Ticket: ${ticketNumber}`,
    'ticket.assigned':  `[IT Ops Hub] Ticket Assigned to You: ${ticketNumber}`,
    'ticket.resolved':  `[IT Ops Hub] Ticket Resolved: ${ticketNumber}`,
    'ticket.commented': `[IT Ops Hub] New Comment on: ${ticketNumber}`,
  };
  return subjects[type] || `[IT Ops Hub] Notification: ${ticketNumber}`;
}

function getEmailHTML(type, name, ticketNumber, message, reporterName) {
  return `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">🔧 IT Operations Hub</h1>
  </div>
  <div style="padding:30px">
    <h2 style="color:#1e3a5f">Hi ${name},</h2>
    <p style="color:#555;font-size:16px;line-height:1.6">${message}</p>
    ${reporterName ? `<p style="color:#888;font-size:14px">Reported by: ${reporterName}</p>` : ''}
    <div style="text-align:center;margin:30px 0">
      <a href="${process.env.APP_URL || 'http://localhost:5173'}/tickets"
         style="background:#2563eb;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold">
        View Ticket ${ticketNumber}
      </a>
    </div>
  </div>
  <div style="background:#f9f9f9;padding:15px;text-align:center;color:#aaa;font-size:12px">
    IT Operations Hub — Internal IT Management Platform
  </div>
</div></body></html>`;
}

// ── Main loop ─────────────────────────────────────────────
async function run() {
  console.log('🔔 Notification Worker started, listening on notifications:queue ...');

  while (true) {
    try {
      // BLPOP blocks until an item is available (timeout 0 = wait forever)
      const result = await redis.blpop('notifications:queue', 0);
      if (result) {
        const [, rawData] = result;
        await processEvent(rawData).catch(err =>
          console.error('Error processing event:', err)
        );
      }
    } catch (err) {
      console.error('Worker loop error:', err.message);
      await new Promise(r => setTimeout(r, 2000)); // backoff
    }
  }
}

run();
