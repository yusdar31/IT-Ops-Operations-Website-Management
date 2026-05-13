'use strict';

const { validationResult } = require('express-validator');
const { pool } = require('../db');

const ASSET_TYPES = ['Server Linux','Server Windows','Cisco Switch','Cisco Router','Firewall','Access Point','NAS Storage','Workstation','Laptop','Printer','UPS','Other'];

// ── GET /api/assets ───────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, type, department, search, page = 1, limit = 15 } = req.query;
    const conditions = [];
    const params     = [];

    if (status)     { conditions.push('a.status = ?');              params.push(status); }
    if (type)       { conditions.push('a.type = ?');                params.push(type); }
    if (department) { conditions.push('a.department = ?');          params.push(department); }
    if (search)     {
      conditions.push('(a.hostname LIKE ? OR a.ip_address LIKE ? OR a.serial_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows]  = await pool.query(
      `SELECT a.*, u.name AS created_by_name
       FROM assets a
       LEFT JOIN users u ON a.created_by = u.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM assets a ${where}`, params
    );

    res.json({ assets: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('asset list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/assets/summary ───────────────────────────────
exports.summary = async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status='active')      AS active,
        SUM(status='inactive')    AS inactive,
        SUM(status='maintenance') AS maintenance
      FROM assets
    `);

    const [byType] = await pool.query(`
      SELECT type, COUNT(*) AS count FROM assets GROUP BY type ORDER BY count DESC
    `);

    const [byDept] = await pool.query(`
      SELECT department, COUNT(*) AS count FROM assets WHERE department IS NOT NULL GROUP BY department ORDER BY count DESC LIMIT 8
    `);

    res.json({ totals, byType, byDept });
  } catch (err) {
    console.error('asset summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/assets/:id ───────────────────────────────────
exports.get = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS created_by_name
       FROM assets a LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Asset not found' });
    res.json({ asset: rows[0] });
  } catch (err) {
    console.error('asset get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/assets ──────────────────────────────────────
exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { hostname, ip_address, type, department, location, status = 'active', serial_number, purchase_date, notes } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO assets (hostname, ip_address, type, department, location, status, serial_number, purchase_date, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [hostname, ip_address, type, department || null, location || null, status, serial_number || null, purchase_date || null, notes || null, req.user.id]
    );
    res.status(201).json({ message: 'Asset created', assetId: result.insertId });
  } catch (err) {
    console.error('asset create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PUT /api/assets/:id ───────────────────────────────────
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { hostname, ip_address, type, department, location, status, serial_number, purchase_date, notes } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE assets SET hostname=?, ip_address=?, type=?, department=?, location=?, status=?, serial_number=?, purchase_date=?, notes=?
       WHERE id=?`,
      [hostname, ip_address, type, department || null, location || null, status, serial_number || null, purchase_date || null, notes || null, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Asset not found' });
    res.json({ message: 'Asset updated' });
  } catch (err) {
    console.error('asset update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── DELETE /api/assets/:id  (admin only) ─────────────────
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM assets WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Asset not found' });
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    console.error('asset delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.ASSET_TYPES = ASSET_TYPES;
