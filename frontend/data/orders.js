import { apiFetch } from '../scripts/utils/api.js';

export async function placeOrder() {
  return apiFetch('/orders', { method: 'POST' });
}

export async function getOrders() {
  return apiFetch('/orders');
}

export async function getOrderItemTracking(orderId, orderItemId) {
  return apiFetch(`/orders/${orderId}/items/${orderItemId}/tracking`);
}
