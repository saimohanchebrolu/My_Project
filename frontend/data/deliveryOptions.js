import { apiFetch } from '../scripts/utils/api.js';

export async function getDeliveryOptions() {
  return apiFetch('/delivery-options');
}
