const API_BASE_URL = 'http://localhost:8000';

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', function () {
    if (checkLoginStatus()) {
        displayOrderSummary();
        initializeExpiryYears();
        setupCardNumberFormatting();
        setupFormValidation();
    }
});

// カートに戻る
function goBackToCart() {
    window.location.href = '../cart/cart.html';
}

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

// 認証ヘッダーを取得
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// カート数を更新
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = totalCount;
}

// 注文概要を表示
function displayOrderSummary() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const orderItems = document.getElementById('orderItems');

    updateCartCount();

    if (cart.length === 0) {
        alert('カートが空です。');
        window.location.href = '../allproduct/allproduct.html';
        return;
    }

    let totalAmount = 0;
    const itemsHtml = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        return `
                    <div class="order-item">
                        <div class="d-flex justify-content-between w-100">
                            <div>
                                <strong>${item.name}</strong>
                                <small class="text-muted d-block">${item.gramWeight}g × ${item.quantity}</small>
                            </div>
                            <div class="text-right">
                                <span>¥${itemTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                `;
    }).join('');

    const totalHtml = `
                <div class="order-item">
                    <div class="d-flex justify-content-between w-100">
                        <span>合計金額</span>
                        <span>¥${totalAmount.toLocaleString()}</span>
                    </div>
                </div>
            `;

    orderItems.innerHTML = itemsHtml + totalHtml;
    document.getElementById('totalAmount').textContent = `¥${totalAmount.toLocaleString()}`;
}

// 有効期限の年を初期化
function initializeExpiryYears() {
    const currentYear = new Date().getFullYear();
    const expiryYear = document.getElementById('expiryYear');

    for (let year = currentYear; year <= currentYear + 10; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        expiryYear.appendChild(option);
    }
}

// カード番号のフォーマッティング
function setupCardNumberFormatting() {
    const cardNumber = document.getElementById('cardNumber');

    cardNumber.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;

        if (formattedValue.length > 19) {
            formattedValue = formattedValue.substring(0, 19);
        }

        e.target.value = formattedValue;

        // カードタイプの判定
        const visaIcon = document.getElementById('visaIcon');
        const mastercardIcon = document.getElementById('mastercardIcon');

        visaIcon.style.display = 'none';
        mastercardIcon.style.display = 'none';

        if (value.startsWith('4')) {
            visaIcon.style.display = 'inline-block';
        } else if (value.startsWith('5') || value.startsWith('2')) {
            mastercardIcon.style.display = 'inline-block';
        }
    });
}

// フォームバリデーション
function setupFormValidation() {
    const cvv = document.getElementById('cvv');
    const cardHolder = document.getElementById('cardHolder');

    // CVVは数字のみ
    cvv.addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // 名義人は英字とスペースのみ
    cardHolder.addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
    });

    // フォーム送信
    document.getElementById('cardForm').addEventListener('submit', function (e) {
        e.preventDefault();
        processPayment();
    });
}

// 決済処理
async function processPayment() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) return;

    // フォームデータを取得
    const cardData = {
        card_number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
        card_holder_name: document.getElementById('cardHolder').value,
        card_expiry_month: parseInt(document.getElementById('expiryMonth').value),
        card_expiry_year: parseInt(document.getElementById('expiryYear').value),
        card_cvv: document.getElementById('cvv').value
    };

    // バリデーション
    if (!validateCardData(cardData)) {
        return;
    }

    // 処理中オーバーレイを表示
    document.getElementById('processingOverlay').style.display = 'flex';

    try {
        // カード情報を保存
        const cardResponse = await fetch(`${API_BASE_URL}/users/me/card/`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'  // これが必要
            },
            body: JSON.stringify(cardData)
        });

        if (!cardResponse.ok) {
            const errorData = await cardResponse.json();
            throw new Error(errorData.detail || 'カード情報の保存に失敗しました');
        }

        // 各商品を購入
        let successCount = 0;
        let errorMessages = [];

        for (const item of cart) {
            try {
                const purchaseData = {
                    product_id: item.id,
                    quantity: item.quantity,
                    use_saved_card: true
                };

                const response = await fetch(`${API_BASE_URL}/users/me/purchase/`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(purchaseData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || '購入に失敗しました');
                }

                successCount++;
            } catch (error) {
                console.error('Purchase error:', error);
                errorMessages.push(`${item.name}: ${error.message}`);
            }
        }

        // 処理完了
        if (successCount > 0) {
            // カートをクリア
            localStorage.removeItem('cart');

            // 処理中オーバーレイを非表示
            document.getElementById('processingOverlay').style.display = 'none';

            // 成功ポップアップを表示
            document.getElementById('successPopup').style.display = 'flex';

            // 3秒後に商品一覧ページに移動
            setTimeout(() => {
                window.location.href = '../allproduct/allproduct.html';
            }, 3000);
        } else {
            throw new Error('すべての商品の購入に失敗しました: ' + errorMessages.join(', '));
        }

    } catch (error) {
        console.error('Payment error:', error);
        document.getElementById('processingOverlay').style.display = 'none';
        alert('決済処理中にエラーが発生しました: ' + error.message);
    }
}

// カードデータのバリデーション
function validateCardData(cardData) {
    // カード番号の検証
    if (!cardData.card_number || cardData.card_number.length < 13) {
        alert('正しいカード番号を入力してください');
        return false;
    }

    // 名義人の検証
    if (!cardData.card_holder_name || cardData.card_holder_name.trim().length < 2) {
        alert('カード名義人を入力してください');
        return false;
    }

    // 有効期限の検証
    if (!cardData.card_expiry_month || !cardData.card_expiry_year) {
        alert('有効期限を選択してください');
        return false;
    }

    // 現在の日付と比較
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (cardData.card_expiry_year < currentYear ||
        (cardData.card_expiry_year === currentYear && cardData.card_expiry_month < currentMonth)) {
        alert('有効期限が過去の日付です');
        return false;
    }

    // CVVの検証
    if (!cardData.card_cvv || cardData.card_cvv.length < 3) {
        alert('正しいCVVを入力してください');
        return false;
    }

    return true;
}