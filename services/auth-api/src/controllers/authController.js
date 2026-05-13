'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, role, department, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account is disabled' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, department: user.department },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role, department } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, department) VALUES (?,?,?,?,?)',
      [name, email, hash, role, department || null]
    );

    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, department } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, department) VALUES (?,?,?,?,?)',
      [name, email, hash, 'viewer', department || null]
    );

    res.status(201).json({
      message: 'Account created successfully',
      userId: result.insertId,
    });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, department, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, department, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, role, department, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name=?, role=?, department=?, is_active=? WHERE id=?',
      [name, role, department, is_active, id]
    );
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
