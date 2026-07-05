require('dotenv').config();
const app = require('./app');
const seed = require('./db/seed');

const PORT = process.env.PORT || 3000;

async function start() {
  const maxRetries = 20;
  let attempt = 0;
  // Retry loop, since the DB container may not be ready yet when this starts.
  while (true) {
    try {
      await seed();
      break;
    } catch (err) {
      attempt += 1;
      if (attempt >= maxRetries) {
        console.error('[server] giving up connecting to database', err);
        process.exit(1);
      }
      console.warn(`[server] database not ready (attempt ${attempt}/${maxRetries}), retrying in 2s...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
  });
}

start();
