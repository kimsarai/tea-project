const API_BASE_URL = 'http://localhost:8000';

// Default fallback tea images for different types
const fallbackTeaImages = {
    '緑茶': 'https://d1f5hsy4d47upe.cloudfront.net/f3/f3ef8a7b20c85c257170c42cc848035e_t.jpeg',
    '烏龍茶': 'https://t4.ftcdn.net/jpg/04/49/09/91/360_F_449099147_TKde64ncyA4rniDj1YLsKGhagBh97UbA.jpg',
    '紅茶': 'https://imageslabo.com/wp-content/uploads/2019/05/206_hot-tea_6602.jpg',
    'default': 'https://imageslabo.com/wp-content/uploads/2019/05/206_hot-tea_6602.jpg'
};

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', function () {
    if (checkLoginStatus()) {
        displayCart();
    }

    // ログアウトボタンのイベントリスナー
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 購入確認ボタンのイベントリスナー
    document.getElementById('confirmPurchaseBtn').addEventListener('click', processPurchase);
});

// ログイン状態の確認
function checkLoginStatus() {
    const token = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');

    if (!token || !username) {
        alert('ログインが必要です。');
        window.location.href = '../login/login.html';
        return false;
    }

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');

    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    userInfo.style.display = 'block';
    userInfo.textContent = `${username}さん`;

    return true;
}

// ログアウト処理
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('cart');
    window.location.href = '../login/login.html';
}

// 認証ヘッダーを取得
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// フォールバック画像を取得
function getFallbackImage(productName) {
    const name = productName.toLowerCase();
    if (name.includes('緑茶') || name.includes('green')) return fallbackTeaImages['緑茶'];
    if (name.includes('烏龍茶') || name.includes('oolong')) return fallbackTeaImages['烏龍茶'];
    if (name.includes('紅茶') || name.includes('black')) return fallbackTeaImages['紅茶'];
    return fallbackTeaImages['default'];
}

// カート数を更新
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = totalCount;
}

// カート内容を表示
function displayCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartContent = document.getElementById('cartContent');
    const emptyCart = document.getElementById('emptyCart');

    updateCartCount();

    if (cart.length === 0) {
        cartContent.innerHTML = '';
        emptyCart.style.display = 'block';
        return;
    }

    emptyCart.style.display = 'none';

    let totalAmount = 0;
    const cartItemsHtml = cart.map((item, index) => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        const fallbackImage = getFallbackImage(item.name);

        return `
                    <div class="col-12">
                        <div class="cart-item">
                            <div class="row align-items-center">
                                <div class="col-md-2">
                                    <img src="${fallbackImage}" alt="${item.name}" class="img-fluid">
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
                                               onchange="setQuantity(${index}, this.value)">
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
                `;
    }).join('');

    const totalSectionHtml = `
                <div class="col-12">
                    <div class="total-section">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5>合計金額</h5>
                            <h4 class="text-success">¥${totalAmount.toLocaleString()}</h4>
                        </div>
                        <button class="btn btn-custom btn-lg btn-block" onclick="proceedToPayment()">
                            <i class="bi bi-credit-card"></i> 購入する
                        </button>
                        <button class="btn btn-outline-secondary btn-block mt-2" onclick="clearCart()">
                            カートを空にする
                        </button>
                    </div>
                </div>
            `;

    cartContent.innerHTML = cartItemsHtml + totalSectionHtml;
}

// 数量を更新
function updateQuantity(index, change) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].quantity = Math.max(1, cart[index].quantity + change);
        localStorage.setItem('cart', JSON.stringify(cart));
        displayCart();
    }
}

// 数量を直接設定
function setQuantity(index, quantity) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
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
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        displayCart();
    }
}

// カートを空にする
function clearCart() {
    if (confirm('カートの中身をすべて削除しますか？')) {
        localStorage.removeItem('cart');
        displayCart();
    }
}

// 決済ページに進む
function proceedToPayment() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert('カートが空です。');
        return;
    }
    // card.htmlに遷移
    window.location.href = '../card/card.html';
}

// 購入確認モーダルを表示（未使用だが残しておく）
function showPurchaseModal() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert('カートが空です。');
        return;
    }

    let totalAmount = 0;
    const itemsListHtml = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        return `
                    <div class="d-flex justify-content-between">
                        <span>${item.name} × ${item.quantity}</span>
                        <span>¥${itemTotal.toLocaleString()}</span>
                    </div>
                `;
    }).join('');

    document.getElementById('purchaseItemsList').innerHTML = itemsListHtml;
    document.getElementById('purchaseTotal').textContent = `¥${totalAmount.toLocaleString()}`;

    $('#purchaseModal').modal('show');
}

// 購入処理（未使用だが残しておく）
function processPurchase() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    // 購入処理のロード状態を表示
    document.getElementById('purchaseLoading').style.display = 'inline';
    document.getElementById('purchaseText').style.display = 'none';
    document.getElementById('confirmPurchaseBtn').disabled = true;

    // 模擬的な購入処理（実際にはAPIを呼び出す）
    setTimeout(() => {
        // 購入完了後の処理
        localStorage.removeItem('cart');
        $('#purchaseModal').modal('hide');

        // 成功メッセージを表示
        document.getElementById('successMessage').textContent = '購入が完了しました。ありがとうございます！';
        document.getElementById('successAlert').style.display = 'block';

        // ボタンの状態を戻す
        document.getElementById('purchaseLoading').style.display = 'none';
        document.getElementById('purchaseText').style.display = 'inline';
        document.getElementById('confirmPurchaseBtn').disabled = false;

        // カート表示を更新
        displayCart();

        // 成功メッセージを3秒後に非表示
        setTimeout(() => {
            document.getElementById('successAlert').style.display = 'none';
        }, 3000);

    }, 2000); // 2秒の模擬処理時間
}