// Configuration
const API_BASE_URL = 'http://localhost/api';
const PRODUCTS_PER_PAGE = 6;

// State management
let currentPage = 1;
let isLoading = false;
let cart = [];
let isLoggedIn = false;

// DOM elements
const productsContainer = document.getElementById('productsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const paginationControls = document.getElementById('paginationControls');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

// ログイン状態の確認
function checkLoginStatus() {
    const token = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const cartLink = document.getElementById('cartLink');

    isLoggedIn = !!(token && username);

    if (isLoggedIn) {
        // ログイン済み
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userInfo) {
            userInfo.style.display = 'block';
            userInfo.textContent = `${username}さん`;
        }
        if (cartLink) cartLink.style.display = 'block';
        document.body.classList.remove('not-logged-in');
        loadCartFromStorage();
        updateCartCount();
    } else {
        // 未ログイン
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
        if (cartLink) cartLink.style.display = 'none';
        document.body.classList.add('not-logged-in');
        cart = [];
    }

    return isLoggedIn;
}

// カートをローカルストレージから読み込み
function loadCartFromStorage() {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
}

// カート数を更新
function updateCartCount() {
    if (!isLoggedIn) return;

    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = cartCount;
    }
}

// ログインページにリダイレクト
function redirectToLogin() {
    alert('商品を購入するにはログインが必要です。');
    window.location.href = '../login/login.html';
}

// Base64の検証
function isValidBase64(str) {
    try {
        return btoa(atob(str)) == str;
    } catch (err) {
        return false;
    }
}

// 商品画像を取得
function getProductImage(product) {
    if (product.image_data && product.image_data.trim() !== '') {
        if (product.image_data.startsWith('data:image/')) {
            return product.image_data;
        } else if (isValidBase64(product.image_data)) {
            return `data:image/jpeg;base64,${product.image_data}`;
        } else if (product.image_data.startsWith('http')) {
            return product.image_data;
        }
    }
    return null;
}

// 商品カードのHTMLを作成
function createProductCard(product) {
    const isOutOfStock = product.stock <= 0;
    const stockClass = isOutOfStock ? 'out-of-stock' : 'stock-info';
    const stockText = isOutOfStock ? '在庫切れ' : `在庫: ${product.stock}個`;
    const productImage = getProductImage(product);

    // ログイン状態に応じてボタンの表示を制御
    let buttonHtml;
    if (!isLoggedIn) {
        buttonHtml = `
            <button type="button" 
                    class="btn btn-outline-primary login-required-btn" 
                    onclick="redirectToLogin()"
                    style="display: block; margin: auto">
                ログインして購入
                <i class="bi bi-box-arrow-in-right"></i>
            </button>
        `;
    } else if (isOutOfStock) {
        buttonHtml = `
            <button type="button" 
                    class="btn btn-outline-secondary" 
                    disabled
                    style="display: block; margin: auto">
                在庫切れ
                <i class="bi bi-x-circle"></i>
            </button>
        `;
    } else {
        buttonHtml = `
            <button type="button" 
                    class="btn btn-outline-success purchase-btn" 
                    onclick="addToCart(${product.id}, '${product.product_name.replace(/'/g, "\\'")}', ${product.price}, ${product.gram_weight})"
                    style="display: block; margin: auto">
                カートに入れる
                <i class="bi bi-cart-plus"></i>
            </button>
        `;
    }

    return `
        <div class="col-sm-6 col-md-4 mb-4">
            <div class="card">
                ${productImage ? `
                    <img src="${productImage}" 
                         class="card-img-top" 
                         alt="${product.product_name}"
                         loading="lazy">
                ` : ''}
                <div class="card-body">
                    <h5 class="card-title">${product.product_name}</h5>
                    <div class="price-tag">¥${product.price.toLocaleString()}</div>
                    <p class="card-text">
                        重量: ${product.gram_weight}g<br>
                        <span class="${stockClass}">${stockText}</span>
                    </p>
                    ${buttonHtml}
                </div>
            </div>
        </div>
    `;
}

// APIから商品を取得
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

// 商品を表示
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

// ローディング表示の制御
function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}

// エラーメッセージを表示
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
}

// エラーメッセージを非表示
function hideError() {
    errorMessage.style.display = 'none';
}

// ページネーションを更新
function updatePagination(currentPage, productsCount) {
    const hasNextPage = productsCount === PRODUCTS_PER_PAGE;
    const hasPrevPage = currentPage > 1;

    prevBtn.disabled = !hasPrevPage;
    nextBtn.disabled = !hasNextPage;

    pageInfo.textContent = `ページ ${currentPage}`;
    paginationControls.style.display = 'flex';
}

// カートに商品を追加
function addToCart(productId, productName, price, gramWeight) {
    if (!isLoggedIn) {
        redirectToLogin();
        return;
    }

    // 既存の商品がカートにあるかチェック
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            gramWeight: gramWeight,
            quantity: 1
        });
    }

    // カートをローカルストレージに保存
    localStorage.setItem('cart', JSON.stringify(cart));

    // カート数を更新
    updateCartCount();

    // 成功メッセージを表示
    alert(`${productName} をカートに追加しました！`);
}

// ログアウト処理
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('cart');
    cart = [];
    checkLoginStatus();
    alert('ログアウトしました');

    // 商品表示を更新（ボタンの状態を変更するため）
    fetchProducts(currentPage);
}

// イベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    fetchProducts(1);

    // ログアウトボタンのイベントリスナー
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // ページネーションのイベントリスナー
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchProducts(currentPage - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        fetchProducts(currentPage + 1);
    });
});

// ネットワークエラーの処理
window.addEventListener('online', () => {
    if (productsContainer.innerHTML.trim() === '') {
        fetchProducts(currentPage);
    }
});

window.addEventListener('offline', () => {
    showError('インターネット接続が失われました。');
});