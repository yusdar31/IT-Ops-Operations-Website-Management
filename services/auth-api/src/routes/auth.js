'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const controller = require('../controllers/authController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
], controller.login);

router.post('/signup', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  body('department').optional().trim(),
], controller.signup);

router.get('/me', authMiddleware, controller.me);

router.post('/register', authMiddleware, requireRole('admin'), [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  body('role').isIn(['admin', 'technician', 'viewer']),
  body('department').optional().trim(),
], controller.register);

router.get('/users', authMiddleware, requireRole('admin'), controller.getUsers);
router.put('/users/:id', authMiddleware, requireRole('admin'), controller.updateUser);

module.exports = router;
