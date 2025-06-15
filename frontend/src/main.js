// ログイン状態の確認
function checkLoginStatus() {
    const token = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const cartLink = document.getElementById('cartLink');

    if (token && username) {
        // ログイン済み
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        userInfo.style.display = 'block';
        userInfo.textContent = `${username}さん`;
        cartLink.style.display = 'block';
    } else {
        // 未ログイン
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
        cartLink.style.display = 'none';
    }
}

// ログインボタンのクリック処理
document.getElementById('loginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'login/login.html';
});

// ログアウトボタンのクリック処理
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('cart');
    checkLoginStatus();
    alert('ログアウトしました');
});

// ページ読み込み時にログイン状態をチェック
document.addEventListener('DOMContentLoaded', checkLoginStatus);