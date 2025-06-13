// Configuration
//研修用
// const API_BASE_URL = 'https://80.ide.lab.daas.co.jp/api'; 
const API_BASE_URL = 'http://localhost/api'; 


const PRODUCTS_PER_PAGE = 6; // Updated to match your configuration

// State management
let currentPage = 1;
let totalProducts = 0;
let isLoading = false;
let cart = [];

// Default fallback tea images for different types (in case image_data is not available)
const fallbackTeaImages = {
  '緑茶': 'https://d1f5hsy4d47upe.cloudfront.net/f3/f3ef8a7b20c85c257170c42cc848035e_t.jpeg',
  '烏龍茶': 'https://t4.ftcdn.net/jpg/04/49/09/91/360_F_449099147_TKde64ncyA4rniDj1YLsKGhagBh97UbA.jpg',
  '紅茶': 'https://imageslabo.com/wp-content/uploads/2019/05/206_hot-tea_6602.jpg',
  'default': 'https://imageslabo.com/wp-content/uploads/2019/05/206_hot-tea_6602.jpg'
};

// DOM elements
const productsContainer = document.getElementById('productsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const paginationControls = document.getElementById('paginationControls');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

// Utility function to process image data
function getProductImage(product) {
  // If image_data exists and is not empty
  if (product.image_data && product.image_data.trim() !== '') {
    // Check if it's already a data URL
    if (product.image_data.startsWith('data:image/')) {
      return product.image_data;
    }
    // Check if it's a base64 string without data URL prefix
    else if (isValidBase64(product.image_data)) {
      // Assume it's a JPEG if no format is specified
      return `data:image/jpeg;base64,${product.image_data}`;
    }
    // Check if it's a regular URL
    else if (product.image_data.startsWith('http')) {
      return product.image_data;
    }
  }
  
  // Fallback to default images based on product name
  return getFallbackImage(product.product_name);
}

// Check if string is valid base64
function isValidBase64(str) {
  try {
    return btoa(atob(str)) == str;
  } catch (err) {
    return false;
  }
}

// Utility function to get fallback image for tea type
function getFallbackImage(productName) {
  const name = productName.toLowerCase();
  if (name.includes('緑茶') || name.includes('green')) return fallbackTeaImages['緑茶'];
  if (name.includes('烏龍茶') || name.includes('oolong')) return fallbackTeaImages['烏龍茶'];
  if (name.includes('紅茶') || name.includes('black')) return fallbackTeaImages['紅茶'];
  return fallbackTeaImages['default'];
}

// Create product card HTML
function createProductCard(product) {
  const isOutOfStock = product.stock <= 0;
  const stockClass = isOutOfStock ? 'out-of-stock' : 'stock-info';
  const stockText = isOutOfStock ? '在庫切れ' : `在庫: ${product.stock}個`;
  const buttonDisabled = isOutOfStock ? 'disabled' : '';
  const buttonText = isOutOfStock ? '在庫切れ' : 'カートに入れる';
  const productImage = getProductImage(product);
  
  return `
    <div class="col-sm-6 col-md-4">
      <div class="card">
        <img src="${productImage}" 
             class="card-img-top" 
             alt="${product.product_name}"
             onerror="this.src='${getFallbackImage(product.product_name)}'"
             loading="lazy">
        <div class="card-body">
          <h5 class="card-title">${product.product_name}</h5>
          <div class="price-tag">¥${product.price.toLocaleString()}</div>
          <p class="card-text">
            重量: ${product.gram_weight}g<br>
            <span class="${stockClass}">${stockText}</span>
          </p>
          <button type="button" 
                  style="display: block; margin: auto" 
                  class="btn btn-outline-success" 
                  ${buttonDisabled}
                  onclick="addToCart('${product.product_name}')">
            ${buttonText}
            <i class="bi bi-cart-fill"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Fetch products from API
async function fetchProducts(page = 1) {
  if (isLoading) return;
  
  isLoading = true;
  showLoading(true);
  hideError();
  
  try {
    const offset = (page - 1) * PRODUCTS_PER_PAGE;
    const response = await fetch(`${API_BASE_URL}/product?offset=${offset}&limit=${PRODUCTS_PER_PAGE}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const products = await response.json();
    
    // If this is the first page, also get total count for pagination
    if (page === 1) {
      // Estimate total based on returned products
      totalProducts = products.length < PRODUCTS_PER_PAGE ? products.length : products.length * 10;
    }
    
    displayProducts(products);
    updatePagination(page, products.length);
    currentPage = page;
    
  } catch (error) {
    console.error('Error fetching products:', error);
    showError(`商品の読み込みに失敗しました: ${error.message}`);
  } finally {
    isLoading = false;
    showLoading(false);
  }
}

// Display products in the container
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="col-12 text-center">
        <p class="lead">商品が見つかりませんでした。</p>
      </div>
    `;
    return;
  }
  
  productsContainer.innerHTML = products.map(product => createProductCard(product)).join('');
}

// Show/hide loading spinner
function showLoading(show) {
  loadingSpinner.style.display = show ? 'block' : 'none';
}

// Show error message
function showError(message) {
  errorText.textContent = message;
  errorMessage.style.display = 'block';
}

// Hide error message
function hideError() {
  errorMessage.style.display = 'none';
}

// Update pagination controls
function updatePagination(currentPage, productsCount) {
  const hasNextPage = productsCount === PRODUCTS_PER_PAGE;
  const hasPrevPage = currentPage > 1;
  
  prevBtn.disabled = !hasPrevPage;
  nextBtn.disabled = !hasNextPage;
  
  pageInfo.textContent = `ページ ${currentPage}`;
  paginationControls.style.display = 'flex';
}

// Add to cart function (placeholder)
function addToCart(productName) {
  // Implement your add to cart logic here
  alert(`${productName} をカートに追加しました！`);

  // Example:
  // fetch(`${API_BASE_URL}/cart/add`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ product_id: productId, quantity: 1 })
  // });
}

// Event listeners
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    fetchProducts(currentPage - 1);
  }
});

nextBtn.addEventListener('click', () => {
  fetchProducts(currentPage + 1);
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts(1);
});

// Handle network errors gracefully
window.addEventListener('online', () => {
  if (productsContainer.innerHTML.trim() === '') {
    fetchProducts(currentPage);
  }
});

window.addEventListener('offline', () => {
  showError('インターネット接続が失われました。');
});