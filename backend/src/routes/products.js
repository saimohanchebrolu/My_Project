const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

function toApiProduct(row) {
  return {
    id: row.id,
    image: row.image,
    name: row.name,
    rating: {
      stars: Number(row.rating_stars),
      count: row.rating_count,
    },
    priceCents: row.price_cents,
    keywords: row.keywords,
    type: row.type || undefined,
    sizeChartLink: row.size_chart_link || undefined,
  };
}

// GET /api/products?search=socks
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await pool.query(
        `SELECT * FROM products
         WHERE name ILIKE $1 OR $2 = ANY (keywords)
         ORDER BY name ASC`,
        [`%${search}%`, search.toLowerCase()]
      );
    } else {
      result = await pool.query('SELECT * FROM products ORDER BY name ASC');
    }
    res.json(result.rows.map(toApiProduct));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(toApiProduct(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
