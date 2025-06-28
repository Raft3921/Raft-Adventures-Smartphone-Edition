const slotsContainer = document.getElementById("slots");
const createBtn = document.getElementById("createWorld");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

// キャラクター選択の読み込みと保存
function loadCharacterSelection() {
  const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
  const selectedCharacter = settings.character || 'raft';
  
  // ラジオボタンを設定
  const radioButton = document.querySelector(`input[name="homeCharacter"][value="${selectedCharacter}"]`);
  if (radioButton) {
    radioButton.checked = true;
  }
}

function saveCharacterSelection() {
  const selectedRadio = document.querySelector('input[name="homeCharacter"]:checked');
  if (selectedRadio) {
    const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
    settings.character = selectedRadio.value;
    localStorage.setItem('gameSettings', JSON.stringify(settings));
  }
}

// キャラクター選択のイベントリスナー
document.querySelectorAll('input[name="homeCharacter"]').forEach(radio => {
  radio.addEventListener('change', saveCharacterSelection);
});

let currentPage = 0;
const slotsPerPage = 15;

function showConfirm(text, onYes, onNo) {
  let old = document.getElementById("confirmDialog");
  if (old) old.remove();
  const dialog = document.createElement("div");
  dialog.id = "confirmDialog";
  dialog.style.position = "fixed";
  dialog.style.top = "50%";
  dialog.style.left = "50%";
  dialog.style.transform = "translate(-50%,-50%)";
  dialog.style.background = "#fff";
  dialog.style.color = "#1a2a4f";
  dialog.style.padding = "24px 32px";
  dialog.style.borderRadius = "18px";
  dialog.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
  dialog.style.zIndex = "99999";
  dialog.style.fontWeight = "bold";
  dialog.style.fontFamily = "\"Yu Gothic\", sans-serif";
  dialog.innerHTML = `
    <div style="margin-bottom:18px;font-size:18px;text-align:center;">${text}</div>
    <div style="display:flex;gap:24px;justify-content:center;">
      <button id="yesBtn" style="padding:10px 32px;border:none;border-radius:12px;background:#22335b;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 1px 4px #22335b;">はい</button>
      <button id="noBtn" style="padding:10px 32px;border:none;border-radius:12px;background:#ccc;color:#1a2a4f;font-size:16px;font-weight:bold;cursor:pointer;">いいえ</button>
    </div>
  `;
  document.body.appendChild(dialog);
  document.getElementById("yesBtn").onclick = () => {
    dialog.remove();
    if (onYes) onYes();
  };
  document.getElementById("noBtn").onclick = () => {
    dialog.remove();
    if (onNo) onNo();
  };
}

function getWorldSlots() {
  return JSON.parse(localStorage.getItem("worldSlots") || "[]");
}
function saveWorldSlots(slots) {
  localStorage.setItem("worldSlots", JSON.stringify(slots));
}
function getUniqueWorldName(baseName) {
  const slots = getWorldSlots();
  let name = baseName;
  let i = 1;
  while (slots.includes(name)) {
    name = `${baseName}(${i})`;
    i++;
  }
  return name;
}

function loadSlots() {
  let slots = getWorldSlots();
  // オブジェクト型スロットを除外
  slots = slots.filter(s => typeof s === 'string');
  saveWorldSlots(slots);
  slotsContainer.innerHTML = "";
  console.log("[スロットリスト]", slots);
  const totalPages = Math.max(1, Math.ceil(slots.length / slotsPerPage));
  const startIndex = currentPage * slotsPerPage;
  const endIndex = Math.min(startIndex + slotsPerPage, slots.length);
  for (let i = startIndex; i < endIndex; i++) {
    const worldName = String(slots[i]);
    const div = document.createElement("div");
    div.className = "slot";

    // サムネイル画像
    const thumbUrl = localStorage.getItem("thumb_" + worldName);
    let src;
    if (thumbUrl && thumbUrl.startsWith("data:image/")) {
      src = thumbUrl; // data URLはそのまま
    } else if (thumbUrl) {
      src = thumbUrl + "?t=" + Date.now(); // 通常URLのみキャッシュバスター
    } else {
      src = "assets/ground.png";
    }
    const thumbImg = document.createElement("img");
    thumbImg.className = "slot-thumbnail";
    thumbImg.src = src;
    thumbImg.onerror = function() { this.src = "assets/ground.png"; };
    div.appendChild(thumbImg);

    const contentDiv = document.createElement("div");
    contentDiv.className = "slot-content";

    const input = document.createElement("input");
    input.value = worldName;
    input.id = "world-name-" + worldName;
    input.name = "world-name";
    input.onchange = () => {
      let newName = input.value.trim();
      if (!newName) {
        input.value = worldName;
        return;
      }
      if (newName !== worldName) {
        newName = getUniqueWorldName(newName);
        // データの移動
        const data = localStorage.getItem("world_" + worldName);
        if (data) {
          localStorage.setItem("world_" + newName, data);
          localStorage.removeItem("world_" + worldName);
        }
        // サムネイルも移動
        const thumb = localStorage.getItem("thumb_" + worldName);
        if (thumb) {
          localStorage.setItem("thumb_" + newName, thumb);
          localStorage.removeItem("thumb_" + worldName);
        }
        // スロット名の更新
        const slots = getWorldSlots();
        slots[i] = String(newName);
        saveWorldSlots(slots);
        input.value = newName;
        loadSlots();
      }
    };

    const playBtn = document.createElement("button");
    playBtn.textContent = "\u25B6"; // ▶
    playBtn.style.fontSize = "32px";
    playBtn.style.width = "48px";
    playBtn.style.height = "48px";
    playBtn.style.padding = "0";
    playBtn.onclick = () => {
      localStorage.setItem("currentSlot", worldName);
      location.href = `index.html?slot=${encodeURIComponent(worldName)}`;
    };

    const editBtn = document.createElement("button");
    editBtn.textContent = "編集";
    editBtn.onclick = () => {
      localStorage.setItem("currentSlot", worldName);
      location.href = `地形.html?slot=${encodeURIComponent(worldName)}`;
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.onclick = () => {
      showConfirm("このワールドを削除しますか？", () => {
        // データ削除
        localStorage.removeItem("world_" + worldName);
        localStorage.removeItem("thumb_" + worldName);
        // スロットリストから削除
        const slots = getWorldSlots();
        slots.splice(i, 1);
        saveWorldSlots(slots);
        // ページ調整
        const newTotalPages = Math.max(1, Math.ceil(slots.length / slotsPerPage));
        if (currentPage >= newTotalPages) {
          currentPage = Math.max(0, newTotalPages - 1);
        }
        loadSlots();
        updateNavigation();
      }, () => {});
    };

    // ボタンをslot-buttonsでまとめて横並び
    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "slot-buttons";
    buttonsDiv.appendChild(playBtn);
    buttonsDiv.appendChild(editBtn);
    buttonsDiv.appendChild(delBtn);

    contentDiv.appendChild(input);
    contentDiv.appendChild(buttonsDiv);
    div.appendChild(contentDiv);
    slotsContainer.appendChild(div);
  }
  updateNavigation();
}

function updateNavigation() {
  const slots = getWorldSlots();
  const totalPages = Math.max(1, Math.ceil(slots.length / slotsPerPage));
  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage >= totalPages - 1;
  pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
}

// ナビゲーションボタンのイベント
prevBtn.onclick = () => {
  if (currentPage > 0) {
    currentPage--;
    loadSlots();
  }
};
nextBtn.onclick = () => {
  const slots = getWorldSlots();
  const totalPages = Math.max(1, Math.ceil(slots.length / slotsPerPage));
  if (currentPage < totalPages - 1) {
    currentPage++;
    loadSlots();
  }
};

createBtn.onclick = () => {
  let slots = getWorldSlots();
  let baseName = "新しいワールド";
  let name = getUniqueWorldName(baseName);
  slots.push(String(name));
  saveWorldSlots(slots);
  // 新しいワールドのデータも空で作成
  localStorage.setItem("world_" + name, JSON.stringify({}));
  // 新しいスロットが作成されたら最後のページに移動
  const totalPages = Math.max(1, Math.ceil(slots.length / slotsPerPage));
  currentPage = totalPages - 1;
  loadSlots();
};

// 設定ボタン
const settingsBtn = document.getElementById("settingsBtn");
if (settingsBtn) {
  settingsBtn.onclick = () => {
    location.href = "settings.html";
  };
}

loadSlots();
loadCharacterSelection();

// キャラクターアニメーション機能
const homeCharacterAnimations = {
  raft: {
    idle: new Image(),
    run1: new Image(),
    run2: new Image()
  },
  mai: {
    idle: new Image(),
    run1: new Image(),
    run2: new Image()
  },
  tanutsuna: {
    idle: new Image(),
    run1: new Image(),
    run2: new Image()
  }
};

// 画像読み込み
homeCharacterAnimations.raft.idle.src = "assets/player.png";
homeCharacterAnimations.raft.run1.src = "assets/player-run1.png";
homeCharacterAnimations.raft.run2.src = "assets/player-run2.png";

homeCharacterAnimations.mai.idle.src = "assets/mai.png";
homeCharacterAnimations.mai.run1.src = "assets/mai-run1.png";
homeCharacterAnimations.mai.run2.src = "assets/mai-run2.png";

homeCharacterAnimations.tanutsuna.idle.src = "assets/tanutsuna.png";
homeCharacterAnimations.tanutsuna.run1.src = "assets/tanutsuna-run1.png";
homeCharacterAnimations.tanutsuna.run2.src = "assets/tanutsuna-run2.png";

// アニメーション状態
let homeAnimationFrame = 0;

// キャラクターアニメーション描画
function drawHomeCharacterAnimation(canvasId, characterName) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const images = homeCharacterAnimations[characterName];
  
  if (!images) return;
  
  // キャンバスをクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 走りアニメーション（2フレーム）
  const frame = Math.floor(homeAnimationFrame / 10) % 2;
  const img = frame === 0 ? images.run1 : images.run2;
  
  if (img.complete && img.naturalWidth > 0) {
    // 64x64に拡大描画
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}

// アニメーション更新
function updateHomeAnimations() {
  homeAnimationFrame++;
  
  // 各キャラクターのアニメーションを描画
  drawHomeCharacterAnimation('homeRaftCanvas', 'raft');
  drawHomeCharacterAnimation('homeMaiCanvas', 'mai');
  drawHomeCharacterAnimation('homeTanutsunaCanvas', 'tanutsuna');
  
  requestAnimationFrame(updateHomeAnimations);
}

// アニメーション開始
updateHomeAnimations();
