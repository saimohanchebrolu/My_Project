-- Amazon clone project - database schema
-- Safe to run multiple times (idempotent).

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gives us gen_random_uuid()

CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY,
  image           TEXT NOT NULL,
  name            TEXT NOT NULL,
  rating_stars    NUMERIC(2,1) NOT NULL DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0,
  price_cents     INTEGER NOT NULL,
  keywords        TEXT[] NOT NULL DEFAULT '{}',
  type            TEXT,
  size_chart_link TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_keywords ON products USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (to_tsvector('english', name));

CREATE TABLE IF NOT EXISTS delivery_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  days_to_deliver INTEGER NOT NULL,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  delivery_option_id  UUID REFERENCES delivery_options(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             UUID NOT NULL REFERENCES customers(id),
  ordered_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  items_subtotal_cents    INTEGER NOT NULL,
  shipping_cents          INTEGER NOT NULL,
  total_before_tax_cents  INTEGER NOT NULL,
  tax_cents               INTEGER NOT NULL,
  total_cents             INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id, ordered_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id                UUID NOT NULL REFERENCES products(id),
  quantity                  INTEGER NOT NULL,
  price_cents               INTEGER NOT NULL,
  delivery_option_id        UUID REFERENCES delivery_options(id),
  estimated_delivery_date   DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
