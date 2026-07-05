const pool = require('../db/pool');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The frontend generates a random UUID per browser (stored in localStorage) and
// sends it as `x-customer-id`. This middleware makes sure a matching row exists
// in the `customers` table so cart_items/orders can reference it via FK, without
// requiring any real authentication.
async function resolveCustomer(req, res, next) {
  try {
    const customerId = req.header('x-customer-id');
    if (!customerId || !UUID_RE.test(customerId)) {
      return res.status(400).json({ error: 'Missing or invalid x-customer-id header' });
    }
    await pool.query(
      'INSERT INTO customers (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
      [customerId]
    );
    req.customerId = customerId;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = resolveCustomer;
