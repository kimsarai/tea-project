const API_BASE_URL = 'http://localhost/api';

// フォーム切り替え
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.querySelector('h2').textContent = '新規登録';
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.querySelector('h2').textContent = 'ログイン';
}

// エラーメッセージ表示
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError(elementId) {
    document.getElementById(elementId).style.display = 'none';
}

// 成功メッセージ表示
function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    successElement.textContent = message;
    successElement.style.display = 'block';
}

// ログイン処理
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const spinner = document.getElementById('loginSpinner');

    hideError('loginError');
    spinner.style.display = 'inline-block';

    try {
        // FormDataを作成してOAuth2形式でログイン
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_BASE_URL}/token`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('ユーザー名またはパスワードが間違っています');
        }

        const data = await response.json();

        // トークンを保存
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('username', username);

        // 商品ページにリダイレクト
        window.location.href = '../allproduct/allproduct.html';

    } catch (error) {
        showError('loginError', error.message);
    } finally {
        spinner.style.display = 'none';
    }
});

// 新規登録処理
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const spinner = document.getElementById('registerSpinner');

    hideError('registerError');
    document.getElementById('registerSuccess').style.display = 'none';

    // パスワード確認
    if (password !== confirmPassword) {
        showError('registerError', 'パスワードが一致しません');
        return;
    }

    spinner.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_BASE_URL}/users/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '登録に失敗しました');
        }

        showSuccess('registerSuccess', '登録が完了しました。ログインしてください。');

        // 3秒後にログインフォームに切り替え
        setTimeout(() => {
            showLoginForm();
            document.getElementById('loginUsername').value = username;
        }, 2000);

    } catch (error) {
        showError('registerError', error.message);
    } finally {
        spinner.style.display = 'none';
    }
});