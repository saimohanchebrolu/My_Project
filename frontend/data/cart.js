import { apiFetch } from '../scripts/utils/api.js';

// Every function here talks to the backend, which persists the cart in
// Postgres, keyed by the guest customer id stored in localStorage
// (see scripts/utils/api.js).

export async function getCart() {
  return apiFetch('/cart');
}

export async function addToCart(productId, quantity = 1) {
  return apiFetch('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function updateQuantity(productId, quantity) {
  return apiFetch(`/cart/items/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
}

export async function updateDeliveryOption(productId, deliveryOptionId) {
  return apiFetch(`/cart/items/${productId}/delivery-option`, {
    method: 'PUT',
    body: JSON.stringify({ deliveryOptionId }),
  });
}

export async function removeFromCart(productId) {
  return apiFetch(`/cart/items/${productId}`, {
    method: 'DELETE',
  });
}

export function getCartQuantity(cart) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}
