'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const controller = require('../controllers/ticketController');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(header.split(' ')[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

const ticketValidation = [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('category').optional().isIn(['incident','service_request','problem','change']),
  body('priority').optional().isIn(['low','medium','high','critical']),
];

const router = Router();
router.use(authMiddleware);

router.get('/summary',              controller.summary);
router.get('/notifications',        controller.getNotifications);
router.put('/notifications/read',   controller.markRead);
router.get('/',                     controller.list);
router.get('/:id',                  controller.get);
router.post('/',       ticketValidation, controller.create);
router.put('/:id',                  controller.update);
router.post('/:id/comments',        controller.addComment);

module.exports = router;
