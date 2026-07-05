<<<<<<< HEAD
# Amazon Clone — Full Stack (Frontend + Backend + Database)

This turns the static frontend into a real full-stack app:

```
frontend/   static site (HTML/CSS/JS) served by nginx, calls the API at /api
backend/    Node.js + Express REST API
db/         Postgres schema (used both by docker-compose init and by the
            backend's own idempotent migration on startup)
docker-compose.yml
```

## Architecture

- **Database**: PostgreSQL. Tables: `products`, `delivery_options`,
  `customers`, `cart_items`, `orders`, `order_items`.
- **Backend**: Express REST API on port 3000. On startup it runs migrations
  and seeds `products` + `delivery_options` from `backend/src/db/products.seed.json`
  if the tables are empty. There's no login system — each browser gets a
  random guest id (`localStorage.customerId`) sent as the `x-customer-id`
  header, which the backend uses to scope carts/orders per visitor.
- **Frontend**: unchanged visually, but `data/products.js`, `data/cart.js`,
  `data/orders.js`, `data/deliveryOptions.js` now call the API instead of
  using a hardcoded array / localStorage cart. Served by nginx, which also
  reverse-proxies `/api/*` to the backend container so the frontend can use
  relative URLs.

## API summary

| Method | Path | Description |
|---|---|---|
| GET | `/api/products?search=` | list/search products |
| GET | `/api/products/:id` | product detail |
| GET | `/api/delivery-options` | available shipping options |
| GET | `/api/cart` | current guest's cart |
| POST | `/api/cart/items` | add item `{productId, quantity}` |
| PUT | `/api/cart/items/:productId` | set quantity `{quantity}` |
| PUT | `/api/cart/items/:productId/delivery-option` | `{deliveryOptionId}` |
| DELETE | `/api/cart/items/:productId` | remove item |
| POST | `/api/orders` | place order from current cart |
| GET | `/api/orders` | list this guest's orders |
| GET | `/api/orders/:orderId` | order detail |
| GET | `/api/orders/:orderId/items/:orderItemId/tracking` | live tracking status |

All cart/order routes require an `x-customer-id: <uuid>` header (the frontend
sets this automatically).

## Run locally with Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000/api/health
- Postgres: localhost:5432 (user/pass/db: `amazon`/`amazon`/`amazon_project`)

Data persists in the `db_data` Docker volume between restarts. To reset
everything: `docker compose down -v`.

## Run without Docker (dev)

```bash
# 1. start Postgres yourself, then:
cd backend
cp .env.example .env   # edit PGHOST etc. to point at your Postgres
npm install
npm run seed            # creates tables + loads product catalog
npm run dev              # starts on :3000

# 2. serve the frontend with any static server, e.g.:
cd frontend
npx serve -l 8080
# the frontend calls /api/... — either run it behind the same nginx proxy,
# or set window.__API_BASE__ = 'http://localhost:3000/api' before amazon.js
# loads (e.g. in a small inline <script> in each HTML file).
```

## Deploying to a server / other container platforms

The three services (`db`, `backend`, `frontend`) are independent containers
and can be deployed anywhere that runs Docker images (a single VM with
docker-compose, ECS/Fargate, Cloud Run, Kubernetes, etc.):

1. Build & push `backend/Dockerfile` and `frontend/Dockerfile` to your
   registry.
2. Provision a Postgres instance (managed RDS/Cloud SQL or your own
   container) and run `db/schema.sql` against it once (or just let the
   backend's own migration do it on first boot — it's idempotent).
3. Point the backend container at that Postgres via `PGHOST`, `PGPORT`,
   `PGUSER`, `PGPASSWORD`, `PGDATABASE` env vars.
4. Point the frontend's nginx `proxy_pass` (in `frontend/nginx.conf`) at the
   backend's reachable address, or terminate `/api` routing at a load
   balancer instead.

## Notes / things to harden before production

- There's no authentication — carts/orders are only scoped by an
  unauthenticated client-generated id. Fine for a demo/portfolio project,
  not for real customer accounts.
- Add HTTPS/TLS termination (e.g. at a load balancer or via certbot + nginx).
- Add rate limiting on the API and stronger input validation if exposed
  publicly.
- Change the default Postgres password before deploying anywhere public.
=======
