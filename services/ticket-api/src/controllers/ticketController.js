'use strict';

const { validationResult } = require('express-validator');
const { pool, redis } = require('../db');

// Auto-generate ticket number: TKT-2026-0001
async function generateTicketNumber() {
  const year = new Date().getFullYear();
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM tickets WHERE YEAR(created_at) = ?', [year]
  );
  return `TKT-${year}-${String(count + 1).padStart(4, '0')}`;
}

// Push event to Redis queue for notification worker
async function publishNotification(payload) {
  try {
    if (redis.status === 'ready') {
      await redis.lpush('notifications:queue', JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('Could not publish to Redis:', err.message);
  }
}

// ── GET /api/tickets ──────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, priority, category, assignee_id, reporter_id, page = 1, limit = 15 } = req.query;
    const conditions = [];
    const params     = [];

    // Viewer role can only see their own tickets
    if (req.user.role === 'viewer') {
      conditions.push('(t.reporter_id = ? OR t.assignee_id = ?)');
      params.push(req.user.id, req.user.id);
    }

    if (status)      { conditions.push('t.status = ?');      params.push(status); }
    if (priority)    { conditions.push('t.priority = ?');    params.push(priority); }
    if (category)    { conditions.push('t.category = ?');    params.push(category); }
    if (assignee_id) { conditions.push('t.assignee_id = ?'); params.push(assignee_id); }
    if (reporter_id) { conditions.push('t.reporter_id = ?'); params.push(reporter_id); }

    const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await pool.query(
      `SELECT t.*,
              r.name AS reporter_name,
              a.name AS assignee_name,
              ast.hostname AS asset_hostname
       FROM tickets t
       LEFT JOIN users r   ON t.reporter_id = r.id
       LEFT JOIN users a   ON t.assignee_id = a.id
       LEFT JOIN assets ast ON t.asset_id   = ast.id
       ${where}
       ORDER BY
         FIELD(t.priority,'critical','high','medium','low'),
         t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets t ${where}`, params
    );

    res.json({ tickets: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('ticket list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/tickets/summary ──────────────────────────────
exports.summary = async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status='open')        AS open,
        SUM(status='in_progress') AS in_progress,
        SUM(status='resolved')    AS resolved,
        SUM(status='closed')      AS closed,
        SUM(priority='critical')  AS critical,
        SUM(priority='high')      AS high
      FROM tickets
    `);
    const [byCategory] = await pool.query(`
      SELECT category, COUNT(*) AS count FROM tickets GROUP BY category
    `);
    res.json({ totals, byCategory });
  } catch (err) {
    console.error('ticket summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/tickets/:id ──────────────────────────────────
exports.get = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*,
              r.name AS reporter_name, r.email AS reporter_email, r.department AS reporter_department,
              a.name AS assignee_name, a.email AS assignee_email,
              ast.hostname AS asset_hostname, ast.ip_address AS asset_ip, ast.type AS asset_type
       FROM tickets t
       LEFT JOIN users r    ON t.reporter_id = r.id
       LEFT JOIN users a    ON t.assignee_id = a.id
       LEFT JOIN assets ast ON t.asset_id    = ast.id
       WHERE t.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ticket not found' });

    const [comments] = await pool.query(
      `SELECT tc.*, u.name AS user_name, u.role AS user_role
       FROM ticket_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.ticket_id = ?
       ORDER BY tc.created_at ASC`, [req.params.id]
    );

    res.json({ ticket: rows[0], comments });
  } catch (err) {
    console.error('ticket get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/tickets ─────────────────────────────────────
exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, category = 'incident', priority = 'medium', asset_id } = req.body;
  try {
    const ticketNumber = await generateTicketNumber();
    const [result] = await pool.query(
      `INSERT INTO tickets (ticket_number, title, description, category, priority, reporter_id, asset_id)
       VALUES (?,?,?,?,?,?,?)`,
      [ticketNumber, title, description, category, priority, req.user.id, asset_id || null]
    );
    const ticketId = result.insertId;

    // Notify all admins about new ticket
    const [admins] = await pool.query("SELECT id FROM users WHERE role='admin' AND is_active=1");
    for (const admin of admins) {
      await publishNotification({
        type: 'ticket.created',
        userId: admin.id,
        ticketId,
        ticketNumber,
        message: `New ticket ${ticketNumber}: ${title}`,
        reporterName: req.user.name,
      });
    }

    res.status(201).json({ message: 'Ticket created', ticketId, ticketNumber });
  } catch (err) {
    console.error('ticket create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PUT /api/tickets/:id ──────────────────────────────────
exports.update = async (req, res) => {
  const { title, description, category, priority, status, assignee_id, asset_id } = req.body;
  const { id } = req.params;

  try {
    const [[existing]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    // Viewers can only add comments, not update tickets
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Insufficient permissions' });

    const resolvedAt = status === 'resolved' && existing.status !== 'resolved'
      ? new Date() : existing.resolved_at;

    await pool.query(
      `UPDATE tickets SET title=?, description=?, category=?, priority=?, status=?, assignee_id=?, asset_id=?, resolved_at=?
       WHERE id=?`,
      [title || existing.title, description || existing.description,
       category || existing.category, priority || existing.priority,
       status || existing.status, assignee_id !== undefined ? assignee_id : existing.assignee_id,
       asset_id !== undefined ? asset_id : existing.asset_id, resolvedAt, id]
    );

    // Notify assignee if changed
    const newAssigneeId = assignee_id !== undefined ? assignee_id : existing.assignee_id;
    if (assignee_id && assignee_id !== existing.assignee_id) {
      await publishNotification({
        type: 'ticket.assigned',
        userId: newAssigneeId,
        ticketId: parseInt(id),
        ticketNumber: existing.ticket_number,
        message: `You have been assigned ticket ${existing.ticket_number}: ${existing.title}`,
      });
    }

    // Notify reporter if resolved
    if (status === 'resolved' && existing.status !== 'resolved') {
      await publishNotification({
        type: 'ticket.resolved',
        userId: existing.reporter_id,
        ticketId: parseInt(id),
        ticketNumber: existing.ticket_number,
        message: `Your ticket ${existing.ticket_number} has been resolved`,
      });
    }

    res.json({ message: 'Ticket updated' });
  } catch (err) {
    console.error('ticket update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/tickets/:id/comments ───────────────────────
exports.addComment = async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content required' });

  try {
    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await pool.query(
      'INSERT INTO ticket_comments (ticket_id, user_id, content) VALUES (?,?,?)',
      [req.params.id, req.user.id, content.trim()]
    );

    // Notify assignee and reporter (if different from commenter)
    const notifyUsers = new Set([ticket.assignee_id, ticket.reporter_id].filter(Boolean));
    notifyUsers.delete(req.user.id);

    for (const userId of notifyUsers) {
      await publishNotification({
        type: 'ticket.commented',
        userId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        message: `${req.user.name} commented on ticket ${ticket.ticket_number}`,
      });
    }

    res.status(201).json({ message: 'Comment added' });
  } catch (err) {
    console.error('comment add error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/tickets/notifications ───────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    const [[{ unread }]] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ notifications: rows, unread });
  } catch (err) {
    console.error('notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PUT /api/tickets/notifications/read ──────────────────
exports.markRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
