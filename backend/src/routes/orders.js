const express = require('express');
const pool = require('../db/pool');
const resolveCustomer = require('../middleware/customer');

const router = express.Router();
router.use(resolveCustomer);

const TAX_RATE = 0.1;

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function loadOrderWithItems(orderId, customerId) {
  const orderResult = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND customer_id = $2',
    [orderId, customerId]
  );
  if (orderResult.rows.length === 0) return null;
  const order = orderResult.rows[0];

  const itemsResult = await pool.query(
    `SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, oi.price_cents,
            oi.delivery_option_id, oi.estimated_delivery_date,
            p.name, p.image
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );

  return toApiOrder(order, itemsResult.rows);
}

function toApiOrder(order, itemRows) {
  return {
    id: order.id,
    orderedAt: order.ordered_at,
    itemsSubtotalCents: order.items_subtotal_cents,
    shippingCents: order.shipping_cents,
    totalBeforeTaxCents: order.total_before_tax_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    items: itemRows.map((r) => ({
      orderItemId: r.order_item_id,
      productId: r.product_id,
      name: r.name,
      image: r.image,
      quantity: r.quantity,
      priceCents: r.price_cents,
      deliveryOptionId: r.delivery_option_id,
      estimatedDeliveryDate: r.estimated_delivery_date,
    })),
  };
}

// POST /api/orders  -> place an order using the customer's current cart
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cartResult = await client.query(
      `SELECT ci.product_id, ci.quantity, ci.delivery_option_id,
              p.price_cents,
              COALESCE(d.days_to_deliver, 7) AS days_to_deliver,
              COALESCE(d.price_cents, 0) AS delivery_price_cents
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN delivery_options d ON d.id = ci.delivery_option_id
       WHERE ci.customer_id = $1
       FOR UPDATE`,
      [req.customerId]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cart is empty' });
    }

    let itemsSubtotalCents = 0;
    let shippingCents = 0;
    const now = new Date();

    for (const row of cartResult.rows) {
      itemsSubtotalCents += row.price_cents * row.quantity;
      shippingCents += row.delivery_price_cents;
    }
    const totalBeforeTaxCents = itemsSubtotalCents + shippingCents;
    const taxCents = Math.round(totalBeforeTaxCents * TAX_RATE);
    const totalCents = totalBeforeTaxCents + taxCents;

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, items_subtotal_cents, shipping_cents, total_before_tax_cents, tax_cents, total_cents)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.customerId, itemsSubtotalCents, shippingCents, totalBeforeTaxCents, taxCents, totalCents]
    );
    const order = orderResult.rows[0];

    for (const row of cartResult.rows) {
      const estimatedDeliveryDate = addDays(now, row.days_to_deliver);
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_cents, delivery_option_id, estimated_delivery_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, row.product_id, row.quantity, row.price_cents, row.delivery_option_id, estimatedDeliveryDate]
      );
    }

    await client.query('DELETE FROM cart_items WHERE customer_id = $1', [req.customerId]);

    await client.query('COMMIT');

    const fullOrder = await loadOrderWithItems(order.id, req.customerId);
    res.status(201).json(fullOrder);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/orders -> all orders for this customer, most recent first
router.get('/', async (req, res, next) => {
  try {
    const { rows: orderRows } = await pool.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY ordered_at DESC',
      [req.customerId]
    );

    const orders = [];
    for (const order of orderRows) {
      const { rows: itemRows } = await pool.query(
        `SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, oi.price_cents,
                oi.delivery_option_id, oi.estimated_delivery_date,
                p.name, p.image
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1
         ORDER BY oi.id ASC`,
        [order.id]
      );
      orders.push(toApiOrder(order, itemRows));
    }

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:orderId -> single order detail
router.get('/:orderId', async (req, res, next) => {
  try {
    const order = await loadOrderWithItems(req.params.orderId, req.customerId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:orderId/items/:orderItemId/tracking -> tracking status for one item
router.get('/:orderId/items/:orderItemId/tracking', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT oi.id AS order_item_id, oi.quantity, oi.estimated_delivery_date,
              o.ordered_at, o.customer_id,
              p.name, p.image
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1 AND oi.id = $2`,
      [req.params.orderId, req.params.orderItemId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order item not found' });
    const row = rows[0];
    if (row.customer_id !== req.customerId) {
      return res.status(404).json({ error: 'Order item not found' });
    }

    const orderedAt = new Date(row.ordered_at);
    const estimatedDeliveryDate = new Date(row.estimated_delivery_date);
    const now = new Date();
    const totalMs = estimatedDeliveryDate - orderedAt;
    const elapsedMs = now - orderedAt;
    const fraction = totalMs > 0 ? elapsedMs / totalMs : 1;

    let status = 'preparing';
    if (fraction >= 1) status = 'delivered';
    else if (fraction >= 1 / 3) status = 'shipped';

    res.json({
      orderItemId: row.order_item_id,
      name: row.name,
      image: row.image,
      quantity: row.quantity,
      orderedAt: row.ordered_at,
      estimatedDeliveryDate: row.estimated_delivery_date,
      status,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
