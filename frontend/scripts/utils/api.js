// Base URL for the backend API. Left relative so it works both behind the
// nginx reverse proxy (docker-compose) and when the backend is on the same
// origin. Override by setting window.__API_BASE__ before this module loads.
export const API_BASE = window.__API_BASE__ || '/api';

function generateUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Every browser gets a random guest "customer id" persisted in localStorage.
// The backend uses this to keep each visitor's cart/orders separate without
// requiring a real login system.
export function getCustomerId() {
  let id = localStorage.getItem('customerId');
  if (!id) {
    id = generateUUID();
    localStorage.setItem('customerId', id);
  }
  return id;
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-customer-id': getCustomerId(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    let message = `Request to ${path} failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch (e) {
      // ignore - body wasn't JSON
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}
