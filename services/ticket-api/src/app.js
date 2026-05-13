'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const ticketRoutes = require('./routes/tickets');
const { initDB }   = require('./db');

const app = express();

app.use(helmet());
app.use(cors({
  origin:       process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials:  true,
  methods:      ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/tickets', ticketRoutes);

app.get('/health', async (req, res) => {
  try {
    const { pool } = require('./db');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'ticket-api', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', service: 'ticket-api', db: 'disconnected' });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3003;
async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`🎫 Ticket API  →  http://0.0.0.0:${PORT}`)
  );
}
start().catch(err => { console.error('Startup failed:', err); process.exit(1); });

module.exports = app;
