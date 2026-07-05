import { getOrders } from '../data/orders.js';
import { formatCurrency } from './utils/money.js';

function formatOrderDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function renderOrders(orders) {
  const grid = document.querySelector('.js-orders-grid');

  if (orders.length === 0) {
    grid.innerHTML = '<p>You have no orders yet.</p>';
    return;
  }

  let html = '';

  orders.forEach((order) => {
    let itemsHTML = '';
    order.items.forEach((item) => {
      itemsHTML += `
        <div class="product-image-container">
          <img src="${item.image}">
        </div>

        <div class="product-details">
          <div class="product-name">
            ${item.name}
          </div>
          <div class="product-delivery-date">
            Arriving on: ${formatOrderDate(item.estimatedDeliveryDate)}
          </div>
          <div class="product-quantity">
            Quantity: ${item.quantity}
          </div>
          <button class="buy-again-button button-primary">
            <img class="buy-again-icon" src="images/icons/buy-again.png">
            <span class="buy-again-message">Buy it again</span>
          </button>
        </div>

        <div class="product-actions">
          <a href="tracking.html?orderId=${order.id}&orderItemId=${item.orderItemId}">
            <button class="track-package-button button-secondary">
              Track package
            </button>
          </a>
        </div>
      `;
    });

    html += `
      <div class="order-container">
        <div class="order-header">
          <div class="order-header-left-section">
            <div class="order-date">
              <div class="order-header-label">Order Placed:</div>
              <div>${formatOrderDate(order.orderedAt)}</div>
            </div>
            <div class="order-total">
              <div class="order-header-label">Total:</div>
              <div>$${formatCurrency(order.totalCents)}</div>
            </div>
          </div>

          <div class="order-header-right-section">
            <div class="order-header-label">Order ID:</div>
            <div>${order.id}</div>
          </div>
        </div>

        <div class="order-details-grid">
          ${itemsHTML}
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

async function main() {
  try {
    const orders = await getOrders();
    renderOrders(orders);
  } catch (err) {
    console.error('Failed to load orders', err);
    document.querySelector('.js-orders-grid').innerHTML =
      '<p>Sorry, we could not load your orders right now. Please try again later.</p>';
  }
}

main();
