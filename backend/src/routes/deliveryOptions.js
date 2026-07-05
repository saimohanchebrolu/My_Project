const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

function addBusinessDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toApiOption(row) {
  const today = new Date();
  const estimatedDeliveryDate = addBusinessDays(today, row.days_to_deliver);
  return {
    id: row.id,
    daysToDeliver: row.days_to_deliver,
    priceCents: row.price_cents,
    estimatedDeliveryDate: estimatedDeliveryDate.toISOString(),
  };
}

// GET /api/delivery-options
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM delivery_options ORDER BY sort_order ASC');
    res.json(result.rows.map(toApiOption));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
