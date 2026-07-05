import { getCart, getCartQuantity } from '../data/cart.js';

async function updateHeaderCartQuantity() {
  const el = document.querySelector('.js-cart-quantity');
  if (!el) return;
  try {
    const cart = await getCart();
    el.innerHTML = getCartQuantity(cart);
  } catch (err) {
    console.error('Failed to load cart quantity', err);
  }
}

updateHeaderCartQuantity();
