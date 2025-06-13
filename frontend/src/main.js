async function fetchItems() {
    try {
        const response = await fetch("http://localhost/api/items");

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched items:", data);

        const list = document.getElementById("itemsList");
        list.innerHTML = "";

        data.forEach(item => {
            const li = document.createElement("li");

            // アイテムタイトルを表示
            const title = document.createElement("span");
            title.textContent = `${item.id}: ${item.title}`;

            // `Base64` をデコードせずそのまま表示
            const img = document.createElement("img");

            // `atob()` を使わずに `Base64` のままセット
            img.src = `data:image/png;base64,${item.image_data}`;  
            img.alt = "アイテム画像";
            img.style.width = "100px";  
            img.style.height = "100px";


            // 要素を追加
            li.appendChild(title);
            li.appendChild(img);
            list.appendChild(li);
        });
    } catch (error) {
        console.error("Error fetching items:", error);
    }
}

async function addItem() {
    const titleInput = document.getElementById("itemTitle");
    const fileInput = document.getElementById("itemImage");

    const title = titleInput.value.trim();
    const file = fileInput.files[0]; // ファイル取得

    if (!title || !file) {
        alert("タイトルと画像を入力してください");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);

    try {
        const response = await fetch("http://localhost/api/items", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }

        const newItem = await response.json();
        console.log("Added item:", newItem);

        // UI に即時反映
        fetchItems();

        // 入力欄をクリア
        titleInput.value = "";
        fileInput.value = "";
    } catch (error) {
        console.error("Error adding item:", error);
    }
}

// ボタンのイベントリスナーを設定
document.getElementById("fetchBtn").addEventListener("click", fetchItems);
document.getElementById("addItemBtn").addEventListener("click", addItem);


// アイテム追加
async function addItem() {
    const titleInput = document.getElementById("itemTitle");
    const fileInput = document.getElementById("itemImage"); 

    const title = titleInput.value.trim();
    const file = fileInput.files[0]; 

    if (!title || !file) {
        alert("タイトルと画像を入力してください");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);

    try {
        const response = await fetch("http://localhost/api/items", {
            method: "POST",
            body: formData 
        });

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }

        const newItem = await response.json();
        console.log("Added item:", newItem);

        titleInput.value = "";
        fileInput.value = "";
    } catch (error) {
        console.error("Error adding item:", error);
    }
}

