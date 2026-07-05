const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const productsRouter = require('./routes/products');
const deliveryOptionsRouter = require('./routes/deliveryOptions');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const pool = require('./db/pool');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.use('/api/products', productsRouter);
app.use('/api/delivery-options', deliveryOptionsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
