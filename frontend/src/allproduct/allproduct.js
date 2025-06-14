// // Configuration
// const API_BASE_URL = 'http://localhost/api';
// const PRODUCTS_PER_PAGE = 6;

// // State management
// let currentPage = 1;
// let totalProducts = 0;
// let isLoading = false;
// let cart = JSON.parse(localStorage.getItem('cart')) || [];

// // Default fallback tea images for different types
// const fallbackTeaImages = {
//   '緑茶': 'https://d1f5hsy4d47upe.cloudfront.net/f3/f3ef8a7b20c85c257170c42cc848035e_t.jpeg',
//   '烏龍茶': 'https://t4.ftcdn.net/jpg/04/49/09/91/360_F_449099147_TKde64ncyA4rniDj1YLsKGhagBh97UbA.jpg',
//   '紅茶': 'https://imageslabo.com/wp-content/uploads/2019/05/206_hot-tea_6602.jpg',
//   'default': 'https://imageslabo.com/wp-content/uploads/2019/05/206_hot-tea_6602.jpg'
// };

// // DOM elements
// const productsContainer = document.getElementById('productsContainer');
// const loadingSpinner = document.getElementById('loadingSpinner');
// const errorMessage = document.getElementById('errorMessage');
// const errorText = document.getElementById('errorText');
// const paginationControls = document.getElementById('paginationControls');
// const prevBtn = document.getElementById('prevBtn');
// const nextBtn = document.getElementById('nextBtn');
// const pageInfo = document.getElementById('pageInfo');

// // Check login status
// function checkLoginStatus() {
//     const token = localStorage.getItem('access_token');
//     const username = localStorage.getItem('username');
    
//     if (!token || !username) {
//         alert('商品を購入するにはログインが必要です。');
//         window.location.href = '../login.html';
//         return false;
//     }
//     return true;
// }

// // Get authentication headers
// function getAuthHeaders() {
//     const token = localStorage.getItem('access_token');
//     return {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//     };
// }

// // Utility function to process image data
// function getProductImage(product) {
//     if (product.image_data && product.image_data.trim() !== '') {
//         if (product.image_data.startsWith('data:image/')) {
//             return product.image_data;
//         } else if (isValidBase64(product.image_data)) {
//             return `data:image/jpeg;base64,${product.image_data}`;
//         } else if (product.image_data.startsWith('http')) {
//             return product.image_data;
//         }
//     }
//     return getFallbackImage(product.product_name);
// }

// // Check if string is valid base64
// function isValidBase64(str) {
//     try {
//         return btoa(atob(str)) == str;
//     } catch (err) {
//         return false;
//     }
// }

// // Utility function to get fallback image for tea type
// function getFallbackImage(productName) {
//     const name = productName.toLowerCase();
//     if (name.includes('緑茶') || name.includes('green')) return fallbackTeaImages['緑茶'];
//     if (name.includes('烏龍茶') || name.includes('oolong')) return fallbackTeaImages['烏龍茶'];
//     if (name.includes('紅茶') || name.includes('black')) return fallbackTeaImages['紅茶'];
//     return fallbackTeaImages['default'];
// }

// // Create product card HTML
// function createProductCard(product) {
//     const isOutOfStock = product.stock <= 0;
//     const stockClass = isOutOfStock ? 'out-of-stock' : 'stock-info';
//     const stockText = isOutOfStock ? '在庫切れ' : `在庫: ${product.stock}個`;
//     const buttonDisabled = isOutOfStock ? 'disabled' : '';
//     const buttonText = isOutOfStock ? '在庫切れ' : 'カートに入れる';
//     const productImage = getProductImage(product);
    
//     return `
//         <div class="col-sm-6 col-md-4">
//             <div class="card">
//                 <img src="${productImage}" 
//                      class="card-img-top" 
//                      alt="${product.product_name}"
//                      onerror="this.src='${getFallbackImage(product.product_name)}'"
//                      loading="lazy">
//                 <div class="card-body">
//                     <h5 class="card-title">${product.product_name}</h5>
//                     <div class="price-tag">¥${product.price.toLocaleString()}</div>
//                     <p class="card-text">
//                         重量: ${product.gram_weight}g<br>
//                         <span class="${stockClass}">${stockText}</span>
//                     </p>
//                     <button type="button" 
//                             style="display: block; margin: auto" 
//                             class="btn btn-outline-success" 
//                             ${buttonDisabled}
//                             onclick="addToCart(${product.id}, '${product.product_name}', ${product.price}, ${product.gram_weight})">
//                         ${buttonText}
//                         <i class="bi bi-cart-fill"></i>
//                     </button>
//                 </div>
//             </div>
//         </div>
//     `;
// }

// // Fetch products from API
// async function fetchProducts(page = 1) {
//     if (isLoading) return;
    
//     isLoading = true;
//     showLoading(true);
//     hideError();
    
//     try {
//         const offset = (page - 1) * PRODUCTS_PER_PAGE;
//         const response = await fetch(`${API_BASE_URL}/product?offset=${offset}&limit=${PRODUCTS_PER_PAGE}`);
        
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
        
//         const products = await response.json();
        
//         if (page === 1) {
//             totalProducts = products.length < PRODUCTS_PER_PAGE ? products.length : products.length * 10;
//         }
        
//         displayProducts(products);
//         updatePagination(page, products.length);
//         currentPage = page;
        
//     } catch (error) {
//         console.error('Error fetching products:', error);
//         showError(`商品の読み込みに失敗しました: ${error.message}`);
//     } finally {
//         isLoading = false;
//         showLoading(false);
//     }
// }

// // Display products in the container
// function displayProducts(products) {
//     if (products.length === 0) {
//         productsContainer.innerHTML = `
//             <div class="col-12 text-center">
//                 <p class="lead">商品が見つかりませんでした。</p>
//             </div>
//         `;
//         return;
//     }
    
//     productsContainer.innerHTML = products.map(product => createProductCard(product)).join('');
// }

// // Show/hide loading spinner
// function showLoading(show) {
//     loadingSpinner.style.display = show ? 'block' : 'none';
// }

// // Show error message
// function showError(message) {
//     errorText.textContent = message;
//     errorMessage.style.display = 'block';
// }

// // Hide error message
// function hideError() {
//     errorMessage.style.display = 'none';
// }

// // Update pagination controls
// function updatePagination(currentPage, productsCount) {
//     const hasNextPage = productsCount === PRODUCTS_PER_PAGE;
//     const hasPrevPage = currentPage > 1;
    
//     prevBtn.disabled = !hasPrevPage;
//     nextBtn.disabled = !hasNextPage;
    
//     pageInfo.textContent = `ページ ${currentPage}`;
//     paginationControls.style.display = 'flex';
// }

// // Add to cart function
// function addToCart(productId, productName, price, gramWeight) {
//     if (!checkLoginStatus()) {
//         return;
//     }

//     // Check if product already exists in cart
//     const existingItem = cart.find(item => item.id === productId);
    
//     if (existingItem) {
//         existingItem.quantity += 1;
//     } else {
//         cart.push({
//             id: productId,
//             name: productName,
//             price: price,
//             gramWeight: gramWeight,
//             quantity: 1
//         });
//     }
    
//     // Save cart to localStorage
//     localStorage.setItem('cart', JSON.stringify(cart));
    
//     // Show success message
//     alert(`${productName} をカートに追加しました！`);
    
//     // Update cart count in navigation (if exists)
//     updateCartCount();
// }

// // Update cart count display
// function updateCartCount() {
//     const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
//     const cartLink = document.querySelector('#cartLink');
//     if (cartLink && cartCount > 0) {
//         cartLink.innerHTML = `<i class="bi bi-cart-fill"></i> カート (${cartCount})`;
//     }
// }

// // Event listeners
// prevBtn.addEventListener('click', () => {
//     if (currentPage > 1) {
//         fetchProducts(currentPage - 1);
//     }
// });

// nextBtn.addEventListener('click', () => {
//     fetchProducts(currentPage + 1);
// });

// // Initialize the page
// document.addEventListener('DOMContentLoaded', () => {
//     // Check if user is logged in before showing products
//     if (checkLoginStatus()) {
//         fetchProducts(1);
//         updateCartCount();
//     }
// });

// // Handle network errors gracefully
// window.addEventListener('online', () => {
//     if (productsContainer.innerHTML.trim() === '') {
//         fetchProducts(currentPage);
//     }
// });

// window.addEventListener('offline', () => {
//     showError('インターネット接続が失われました。');
// });