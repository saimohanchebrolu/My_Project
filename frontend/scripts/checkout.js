import { getCart, removeFromCart, updateQuantity, updateDeliveryOption, getCartQuantity } from '../data/cart.js';
import { getDeliveryOptions } from '../data/deliveryOptions.js';
import { placeOrder } from '../data/orders.js';
import { formatCurrency } from './utils/money.js';

const TAX_RATE = 0.1;

let cart = [];
let deliveryOptions = [];

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function deliveryOptionForItem(item) {
  return deliveryOptions.find((o) => o.id === item.deliveryOptionId) || deliveryOptions[0];
}

function renderOrderSummary() {
  let html = '';

  cart.forEach((item) => {
    const chosenOption = deliveryOptionForItem(item);

    const deliveryOptionsHTML = deliveryOptions
      .map((option) => {
        const isChecked = item.deliveryOptionId
          ? option.id === item.deliveryOptionId
          : option === deliveryOptions[0];
        const priceLabel = option.priceCents === 0 ? 'FREE Shipping' : `$${formatCurrency(option.priceCents)} - Shipping`;
        return `
          <div class="delivery-option">
            <input type="radio" ${isChecked ? 'checked' : ''}
              class="delivery-option-input js-delivery-option"
              data-product-id="${item.productId}"
              data-delivery-option-id="${option.id}"
              name="delivery-option-${item.productId}">
            <div>
              <div class="delivery-option-date">
                ${formatDate(option.estimatedDeliveryDate)}
              </div>
              <div class="delivery-option-price">
                ${priceLabel}
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    html += `
      <div class="cart-item-container js-cart-item-container-${item.productId}">
        <div class="delivery-date">
          Delivery date: ${chosenOption ? formatDate(chosenOption.estimatedDeliveryDate) : 'TBD'}
        </div>

        <div class="cart-item-details-grid">
          <img class="product-image"
            src="${item.product.image}">

          <div class="cart-item-details">
            <div class="product-name">
              ${item.product.name}
            </div>
            <div class="product-price">
              $${formatCurrency(item.product.priceCents)}
            </div>
            <div class="product-quantity js-product-quantity-${item.productId}">
              <span>
                Quantity: <span class="quantity-label">${item.quantity}</span>
              </span>
              <span class="update-quantity-link link-primary js-update-link" data-product-id="${item.productId}">
                Update
              </span>
              <span class="delete-quantity-link link-primary js-delete-link" data-product-id="${item.productId}">
                Delete
              </span>
            </div>
          </div>

          <div class="delivery-options">
            <div class="delivery-options-title">
              Choose a delivery option:
            </div>
            ${deliveryOptionsHTML}
          </div>
        </div>
      </div>
    `;
  });

  document.querySelector('.js-order-summary').innerHTML = html || '<p>Your cart is empty.</p>';
}

function renderPaymentSummary() {
  const itemsSubtotalCents = cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const shippingCents = cart.reduce((sum, item) => {
    const option = deliveryOptionForItem(item);
    return sum + (option ? option.priceCents : 0);
  }, 0);
  const totalBeforeTaxCents = itemsSubtotalCents + shippingCents;
  const taxCents = Math.round(totalBeforeTaxCents * TAX_RATE);
  const totalCents = totalBeforeTaxCents + taxCents;
  const itemCount = getCartQuantity(cart);

  document.querySelector('.js-payment-summary').innerHTML = `
    <div class="payment-summary-title">
      Order Summary
    </div>

    <div class="payment-summary-row">
      <div>Items (${itemCount}):</div>
      <div class="payment-summary-money">$${formatCurrency(itemsSubtotalCents)}</div>
    </div>

    <div class="payment-summary-row">
      <div>Shipping &amp; handling:</div>
      <div class="payment-summary-money">$${formatCurrency(shippingCents)}</div>
    </div>

    <div class="payment-summary-row subtotal-row">
      <div>Total before tax:</div>
      <div class="payment-summary-money">$${formatCurrency(totalBeforeTaxCents)}</div>
    </div>

    <div class="payment-summary-row">
      <div>Estimated tax (10%):</div>
      <div class="payment-summary-money">$${formatCurrency(taxCents)}</div>
    </div>

    <div class="payment-summary-row total-row">
      <div>Order total:</div>
      <div class="payment-summary-money">$${formatCurrency(totalCents)}</div>
    </div>

    <button class="place-order-button button-primary js-place-order" ${cart.length === 0 ? 'disabled' : ''}>
      Place your order
    </button>
  `;

  document.querySelector('.js-checkout-header-item-count').innerHTML = `${itemCount} items`;

  document.querySelector('.js-place-order')?.addEventListener('click', async (e) => {
    const button = e.currentTarget;
    button.disabled = true;
    button.textContent = 'Placing order...';
    try {
      const order = await placeOrder();
      window.location.href = `orders.html?justPlaced=${order.id}`;
    } catch (err) {
      console.error('Failed to place order', err);
      alert('Sorry, something went wrong placing your order. Please try again.');
      button.disabled = false;
      button.textContent = 'Place your order';
    }
  });
}

function attachOrderSummaryHandlers() {
  document.querySelectorAll('.js-delivery-option').forEach((input) => {
    input.addEventListener('change', async () => {
      const { productId, deliveryOptionId } = input.dataset;
      try {
        cart = await updateDeliveryOption(productId, deliveryOptionId);
        renderOrderSummary();
        renderPaymentSummary();
        attachOrderSummaryHandlers();
      } catch (err) {
        console.error('Failed to update delivery option', err);
      }
    });
  });

  document.querySelectorAll('.js-delete-link').forEach((link) => {
    link.addEventListener('click', async () => {
      const productId = link.dataset.productId;
      try {
        cart = await removeFromCart(productId);
        renderOrderSummary();
        renderPaymentSummary();
        attachOrderSummaryHandlers();
      } catch (err) {
        console.error('Failed to remove item', err);
      }
    });
  });

  document.querySelectorAll('.js-update-link').forEach((link) => {
    link.addEventListener('click', () => {
      const productId = link.dataset.productId;
      const container = document.querySelector(`.js-product-quantity-${productId}`);
      const currentItem = cart.find((item) => item.productId === productId);
      if (!container || !currentItem) return;

      container.innerHTML = `
        <input type="number" min="1" max="10" class="quantity-input js-quantity-input" value="${currentItem.quantity}">
        <span class="save-quantity-link link-primary js-save-quantity" data-product-id="${productId}">Save</span>
      `;

      container.querySelector('.js-save-quantity').addEventListener('click', async () => {
        const input = container.querySelector('.js-quantity-input');
        const quantity = Number(input.value);
        if (!Number.isInteger(quantity) || quantity < 1) {
          alert('Please enter a quantity of at least 1.');
          return;
        }
        try {
          cart = await updateQuantity(productId, quantity);
          renderOrderSummary();
          renderPaymentSummary();
          attachOrderSummaryHandlers();
        } catch (err) {
          console.error('Failed to update quantity', err);
        }
      });
    });
  });
}

async function main() {
  try {
    [cart, deliveryOptions] = await Promise.all([getCart(), getDeliveryOptions()]);
    renderOrderSummary();
    renderPaymentSummary();
    attachOrderSummaryHandlers();
  } catch (err) {
    console.error('Failed to load checkout data', err);
    document.querySelector('.js-order-summary').innerHTML =
      '<p>Sorry, we could not load your cart right now. Please try again later.</p>';
  }
}

main();
