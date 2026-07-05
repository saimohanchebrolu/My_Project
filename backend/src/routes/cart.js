const express = require('express');
const pool = require('../db/pool');
const resolveCustomer = require('../middleware/customer');

const router = express.Router();
router.use(resolveCustomer);

async function getCartRows(customerId) {
  const { rows } = await pool.query(
    `SELECT ci.product_id, ci.quantity, ci.delivery_option_id,
            p.image, p.name, p.price_cents, p.rating_stars, p.rating_count
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.customer_id = $1
     ORDER BY ci.created_at ASC`,
    [customerId]
  );
  return rows.map((r) => ({
    productId: r.product_id,
    quantity: r.quantity,
    deliveryOptionId: r.delivery_option_id,
    product: {
      image: r.image,
      name: r.name,
      priceCents: r.price_cents,
      rating: { stars: Number(r.rating_stars), count: r.rating_count },
    },
  }));
}

// GET /api/cart
router.get('/', async (req, res, next) => {
  try {
    res.json(await getCartRows(req.customerId));
  } catch (err) {
    next(err);
  }
});

// POST /api/cart/items { productId, quantity }
router.post('/items', async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required' });

    const product = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    let defaultDeliveryOptionId = null;
    const defaultOption = await pool.query(
      'SELECT id FROM delivery_options ORDER BY sort_order ASC LIMIT 1'
    );
    if (defaultOption.rows.length > 0) defaultDeliveryOptionId = defaultOption.rows[0].id;

    await pool.query(
      `INSERT INTO cart_items (customer_id, product_id, quantity, delivery_option_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (customer_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = now()`,
      [req.customerId, productId, quantity, defaultDeliveryOptionId]
    );

    res.status(201).json(await getCartRows(req.customerId));
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/items/:productId { quantity }
router.put('/items/:productId', async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }
    const result = await pool.query(
      `UPDATE cart_items SET quantity = $1, updated_at = now()
       WHERE customer_id = $2 AND product_id = $3`,
      [quantity, req.customerId, req.params.productId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cart item not found' });
    res.json(await getCartRows(req.customerId));
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/items/:productId/delivery-option { deliveryOptionId }
router.put('/items/:productId/delivery-option', async (req, res, next) => {
  try {
    const { deliveryOptionId } = req.body;
    if (!deliveryOptionId) return res.status(400).json({ error: 'deliveryOptionId is required' });

    const option = await pool.query('SELECT id FROM delivery_options WHERE id = $1', [deliveryOptionId]);
    if (option.rows.length === 0) return res.status(404).json({ error: 'Delivery option not found' });

    const result = await pool.query(
      `UPDATE cart_items SET delivery_option_id = $1, updated_at = now()
       WHERE customer_id = $2 AND product_id = $3`,
      [deliveryOptionId, req.customerId, req.params.productId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cart item not found' });
    res.json(await getCartRows(req.customerId));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/items/:productId
router.delete('/items/:productId', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE customer_id = $1 AND product_id = $2', [
      req.customerId,
      req.params.productId,
    ]);
    res.json(await getCartRows(req.customerId));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
