import { getOrderItemTracking } from '../data/orders.js';

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const STEPS = ['preparing', 'shipped', 'delivered'];
const STEP_LABELS = { preparing: 'Preparing', shipped: 'Shipped', delivered: 'Delivered' };

function renderTracking(tracking) {
  document.querySelector('.js-delivery-date').innerHTML =
    tracking.status === 'delivered'
      ? `Delivered on ${formatDate(tracking.estimatedDeliveryDate)}`
      : `Arriving on ${formatDate(tracking.estimatedDeliveryDate)}`;

  document.querySelector('.js-product-name').innerHTML = tracking.name;
  document.querySelector('.js-product-quantity').innerHTML = `Quantity: ${tracking.quantity}`;
  document.querySelector('.js-product-image').src = tracking.image;

  const currentIndex = STEPS.indexOf(tracking.status);

  document.querySelector('.js-progress-labels').innerHTML = STEPS.map((step, i) => `
    <div class="progress-label ${i === currentIndex ? 'current-status' : ''}">
      ${STEP_LABELS[step]}
    </div>
  `).join('');

  const progressPercent = STEPS.length > 1 ? (currentIndex / (STEPS.length - 1)) * 100 : 0;
  document.querySelector('.js-progress-bar').style.width = `${progressPercent}%`;
}

async function main() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const orderItemId = params.get('orderItemId');

  if (!orderId || !orderItemId) {
    document.querySelector('.order-tracking').innerHTML =
      '<a class="back-to-orders-link link-primary" href="orders.html">View all orders</a>' +
      '<p>Select "Track package" from an order to see its status here.</p>';
    return;
  }

  try {
    const tracking = await getOrderItemTracking(orderId, orderItemId);
    renderTracking(tracking);
  } catch (err) {
    console.error('Failed to load tracking info', err);
    document.querySelector('.js-delivery-date').innerHTML = 'Sorry, we could not find tracking info for this item.';
  }
}

main();
