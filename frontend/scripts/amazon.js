import { addToCart, getCart, getCartQuantity } from '../data/cart.js';
import { getProducts } from '../data/products.js';
import { formatCurrency } from './utils/money.js';

function renderProductsGrid(products) {
  let productsHTML = '';

  products.forEach((product) => {
    productsHTML += `
      <div class="product-container">
        <div class="product-image-container">
          <img class="product-image"
            src="${product.image}" alt="${product.name}">
        </div>

        <div class="product-name limit-text-to-2-lines">
          ${product.name}
        </div>

        <div class="product-rating-container">
          <div class="product-rating-stars">
            ⭐ ${product.rating.stars}
          </div>

          <div class="product-rating-count link-primary">
            ${product.rating.count}
          </div>
        </div>

        <div class="product-price">
          $${formatCurrency(product.priceCents)}
        </div>

        <div class="product-quantity-container">
          <select class="js-quantity-selector-${product.id}">
            ${Array.from({ length: 10 }, (_, i) => i + 1)
              .map((n) => `<option ${n === 1 ? 'selected' : ''} value="${n}">${n}</option>`)
              .join('')}
          </select>
        </div>

        <div class="product-spacer"></div>

        <div class="added-to-cart js-added-to-cart-${product.id}">
          <img src="images/icons/checkmark.png">
          Added
        </div>

        <button class="add-to-cart-button button-primary js-add-to-cart"
          data-product-id="${product.id}">
          Add to Cart
        </button>
      </div>
    `;
  });

  document.querySelector('.js-products-grid').innerHTML = productsHTML;
}

async function updateCartQuantity() {
  const cart = await getCart();
  document.querySelector('.js-cart-quantity').innerHTML = getCartQuantity(cart);
}

function showAddedToCartFeedback(productId) {
  const el = document.querySelector(`.js-added-to-cart-${productId}`);
  if (!el) return;
  el.classList.add('is-visible');
  clearTimeout(el.dataset.timeoutId);
  const timeoutId = setTimeout(() => {
    el.classList.remove('is-visible');
  }, 2000);
  el.dataset.timeoutId = timeoutId;
}

function attachAddToCartHandlers() {
  document.querySelectorAll('.js-add-to-cart').forEach((button) => {
    button.addEventListener('click', async () => {
      const productId = button.dataset.productId;
      const select = document.querySelector(`.js-quantity-selector-${productId}`);
      const quantity = select ? Number(select.value) : 1;

      button.disabled = true;
      try {
        await addToCart(productId, quantity);
        await updateCartQuantity();
        showAddedToCartFeedback(productId);
      } catch (err) {
        console.error('Failed to add to cart', err);
        alert('Sorry, something went wrong adding this item to your cart.');
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function main() {
  try {
    const products = await getProducts();
    renderProductsGrid(products);
    attachAddToCartHandlers();
    await updateCartQuantity();
  } catch (err) {
    console.error('Failed to load products', err);
    document.querySelector('.js-products-grid').innerHTML =
      '<p>Sorry, we could not load products right now. Please try again later.</p>';
  }
}

main();
