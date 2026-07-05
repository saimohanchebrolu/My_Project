const fs = require('fs');
const path = require('path');
const pool = require('./pool');
const migrate = require('./migrate');

const DEFAULT_DELIVERY_OPTIONS = [
  { daysToDeliver: 7, priceCents: 0, sortOrder: 1 },
  { daysToDeliver: 3, priceCents: 499, sortOrder: 2 },
  { daysToDeliver: 1, priceCents: 999, sortOrder: 3 },
];

async function seedProducts(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM products');
  if (rows[0].count > 0) {
    console.log(`[seed] products table already has ${rows[0].count} rows, skipping`);
    return;
  }

  const productsPath = path.join(__dirname, 'products.seed.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  for (const p of products) {
    await client.query(
      `INSERT INTO products (id, image, name, rating_stars, rating_count, price_cents, keywords, type, size_chart_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id,
        p.image,
        p.name,
        p.rating?.stars ?? 0,
        p.rating?.count ?? 0,
        p.priceCents,
        p.keywords || [],
        p.type || null,
        p.sizeChartLink || null,
      ]
    );
  }
  console.log(`[seed] inserted ${products.length} products`);
}

async function seedDeliveryOptions(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM delivery_options');
  if (rows[0].count > 0) {
    console.log(`[seed] delivery_options already has ${rows[0].count} rows, skipping`);
    return;
  }

  for (const opt of DEFAULT_DELIVERY_OPTIONS) {
    await client.query(
      `INSERT INTO delivery_options (days_to_deliver, price_cents, sort_order) VALUES ($1, $2, $3)`,
      [opt.daysToDeliver, opt.priceCents, opt.sortOrder]
    );
  }
  console.log(`[seed] inserted ${DEFAULT_DELIVERY_OPTIONS.length} delivery options`);
}

async function seed() {
  await migrate();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedProducts(client);
    await seedDeliveryOptions(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] failed', err);
      process.exit(1);
    });
}

module.exports = seed;
