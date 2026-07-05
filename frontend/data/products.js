import { apiFetch } from '../scripts/utils/api.js';

export async function getProducts(search) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch(`/products${query}`);
}

export async function getProduct(productId) {
  return apiFetch(`/products/${productId}`);
}
