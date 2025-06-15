const API_BASE_URL = 'http://localhost/api';

// State management
let cart = [];
let isLoggedIn = false;

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', function () {
    if (checkLoginStatus()) {
        displayCart();
    }
});

// ログイン状態の確認
function checkLoginStatus() {
    const token = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');

    isLoggedIn = !!(token && username);

    if (isLoggedIn) {
        // ログイン済み
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userInfo) {
            userInfo.style.display = 'block';
            userInfo.textContent = `${username}さん`;
        }
        loadCartFromStorage();
        return true;
    } else {
        // 未ログイン
        alert('ログインが必要です。');
        window.location.href = '../login/login.html';
        return false;
    }
}

// ログアウト処理
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('cart');
    cart = [];
    isLoggedIn = false;
    alert('ログアウトしました');
    window.location.href = '../allproduct/allproduct.html';
}

// カートをローカルストレージから読み込み
function loadCartFromStorage() {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
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
}

// APIから商品詳細を取得
async function fetchProductDetails(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/product?offset=0&limit=1000`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        return products.find(product => product.id === productId);
    } catch (error) {
        console.error('Error fetching product details:', error);
        return null;
    }
}

// カート数を更新
function updateCartCount() {
    if (!isLoggedIn) return;

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = totalCount;
    }
}

// カート内容を表示
async function displayCart() {
    const cartContent = document.getElementById('cartContent');
    const emptyCart = document.getElementById('emptyCart');
    const totalSection = document.getElementById('totalSection');
    const totalAmount = document.getElementById('totalAmount');

    updateCartCount();

    if (cart.length === 0) {
        cartContent.innerHTML = '';
        if (emptyCart) emptyCart.style.display = 'block';
        if (totalSection) totalSection.style.display = 'none';
        return;
    }

    if (emptyCart) emptyCart.style.display = 'none';
    if (totalSection) totalSection.style.display = 'block';

    let total = 0;
    const cartItemsHtml = [];

    // 各商品の詳細情報を取得
    for (let index = 0; index < cart.length; index++) {
        const item = cart[index];
        const productDetails = await fetchProductDetails(item.id);
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        // 商品画像を取得（APIから取得した詳細情報を使用）
        const productImage = productDetails ? getProductImage(productDetails) : 
                           getProductImage({});

        cartItemsHtml.push(`
            <div class="row">
                <div class="col-12">
                    <div class="cart-item">
                        <div class="row align-items-center">
                            <div class="col-md-2">
                                <img src="${productImage}" alt="${item.name}" class="img-fluid" style="max-height: 80px; object-fit: cover;">
                            </div>
                            <div class="col-md-4">
                                <h6>${item.name}</h6>
                                <small class="text-muted">${item.gramWeight}g</small>
                            </div>
                            <div class="col-md-2">
                                <span class="font-weight-bold">¥${item.price.toLocaleString()}</span>
                            </div>
                            <div class="col-md-2">
                                <div class="quantity-controls">
                                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, -1)">
                                        <i class="bi bi-dash"></i>
                                    </button>
                                    <input type="number" class="form-control quantity-input" 
                                           value="${item.quantity}" min="1" 
                                           onchange="setQuantity(${index}, this.value)"
                                           style="width: 60px; display: inline-block; text-align: center;">
                                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, 1)">
                                        <i class="bi bi-plus"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-1">
                                <span class="font-weight-bold">¥${itemTotal.toLocaleString()}</span>
                            </div>
                            <div class="col-md-1">
                                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    cartContent.innerHTML = cartItemsHtml.join('');
    
    // 合計金額を更新
    if (totalAmount) {
        totalAmount.textContent = `¥${total.toLocaleString()}`;
    }
}

// 数量を更新
function updateQuantity(index, change) {
    if (cart[index]) {
        cart[index].quantity = Math.max(1, cart[index].quantity + change);
        localStorage.setItem('cart', JSON.stringify(cart));
        displayCart();
    }
}

// 数量を直接設定
function setQuantity(index, quantity) {
    const newQuantity = parseInt(quantity);
    if (cart[index] && newQuantity > 0) {
        cart[index].quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        displayCart();
    }
}

// カートから商品を削除
function removeFromCart(index) {
    if (confirm('この商品をカートから削除しますか？')) {
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        displayCart();
    }
}

// カートを空にする
function clearCart() {
    if (confirm('カートの中身をすべて削除しますか？')) {
        cart = [];
        localStorage.removeItem('cart');
        displayCart();
    }
}

// 決済ページに進む
function proceedToPayment() {
    if (cart.length === 0) {
        alert('カートが空です。');
        return;
    }
    // card.htmlに遷移
    window.location.href = '../card/card.html';
}

// イベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    // ログアウトボタンのイベントリスナー
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});