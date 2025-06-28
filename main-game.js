const urlParams = new URLSearchParams(window.location.search);
let slotName = urlParams.get("slot");
if (!slotName) slotName = localStorage.getItem("currentSlot") || "新しいワールド";
slotName = String(slotName); // 文字列化

const TILE_SIZE = 32;
const SCALE = 2.0;
const mapCols = 100;
const mapRows = 20;
const map = [];

// 地形データのロード
function loadMapFromStorage() {
  const savedMap = localStorage.getItem("world_" + slotName);
  if (savedMap) {
    try {
    const parsed = JSON.parse(savedMap);
    if (Array.isArray(parsed)) {
        // 古い形式（配列のみ）
      map.length = 0;
      map.push(...parsed);
        window.dummyOverlays = {};
        return true;
      } else if (parsed.map && Array.isArray(parsed.map)) {
        // 新しい形式（mapとdummyOverlaysを含む）
        map.length = 0;
        map.push(...parsed.map);
        window.dummyOverlays = parsed.dummyOverlays || {};
      return true;
      }
    } catch (e) {
      console.error("マップ読み込みエラー:", e);
    }
  }
  // デフォルトマップ作成
  for (let r = 0; r < mapRows; r++) {
    map[r] = [];
    for (let c = 0; c < mapCols; c++) map[r][c] = 0;
  }
  window.dummyOverlays = {};
  return false;
}
loadMapFromStorage();

// 画像の準備
const groundImg = new Image(); groundImg.src = "assets/ground.png";
const dirtImg = new Image();   dirtImg.src = "assets/dirt.png";
const enemyImg = new Image();  enemyImg.src = "assets/enemy.png";
const goalImg = new Image();   goalImg.src = "assets/goal.png";
const stoneImg = new Image();     stoneImg.src = "assets/stone.png";
const poisonImg = new Image();    poisonImg.src = "assets/poison.png";
const trampolineImg = new Image();trampolineImg.src = "assets/trampoline.png";
const ladderImg = new Image();    ladderImg.src = "assets/ladder.png";
const enemyMoveImg1 = new Image(); enemyMoveImg1.src = "assets/enemy-move1.png";
const enemyMoveImg2 = new Image(); enemyMoveImg2.src = "assets/enemy-move2.png";
const deathScreenImg = new Image(); deathScreenImg.src = "assets/death_screen.png";
const deathScreenFallImg = new Image(); deathScreenFallImg.src = "assets/death_screen_fall.png";
const breakblockImg = new Image(); breakblockImg.src = "assets/breakblock.png";
const breakableImg = breakblockImg; // breakable block
const rail1Img = new Image(); rail1Img.src = "assets/rail1.png";
const rail2Img = new Image(); rail2Img.src = "assets/rail2.png";
const rail3Img = new Image(); rail3Img.src = "assets/rail3.png";
const coinImg = new Image(); coinImg.src = "assets/coin.png";
const checkpointImg = new Image(); checkpointImg.src = "assets/checkpoint.png";
const goldgoalImg = new Image(); goldgoalImg.src = "assets/goldgoal.png";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
window.canvas = canvas;
window.ctx = ctx;
window.slotName = slotName;

// キャンバスサイズの動的調整
function resizeCanvas() {
  const maxWidth = window.innerWidth * 0.95;
  const maxHeight = window.innerHeight * 0.8;
  const aspectRatio = 1024 / 640; // 元のキャンバスのアスペクト比
  
  let newWidth = maxWidth;
  let newHeight = maxWidth / aspectRatio;
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = maxHeight * aspectRatio;
  }
  
  // キャンバスの表示サイズを調整（実際の解像度は変更しない）
  canvas.style.width = newWidth + 'px';
  canvas.style.height = newHeight + 'px';
  
  // スケールを計算
  const scaleX = newWidth / 1024;
  const scaleY = newHeight / 640;
  window.dynamicScale = Math.min(scaleX, scaleY) * SCALE;
  
  console.log('キャンバスサイズ調整:', {
    width: newWidth,
    height: newHeight,
    scale: window.dynamicScale
  });
}

// 初期サイズ調整
resizeCanvas();

// ウィンドウリサイズ時の調整
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 100); // 向き変更後に少し待ってから調整
});

// 画像読み込み
const playerImg = document.getElementById("player");
const playerRun1Img = document.getElementById("player-run1");
const playerRun2Img = document.getElementById("player-run2");
const playerJump1Img = document.getElementById("player-jump1");
const playerJump2Img = document.getElementById("player-jump2");

// キャラクター画像の定義
const characterImages = {
  raft: {
    idle: playerImg,
    run1: playerRun1Img,
    run2: playerRun2Img,
    jump1: playerJump1Img,
    jump2: playerJump2Img
  },
  mai: {
    idle: new Image(),
    run1: new Image(),
    run2: new Image(),
    jump1: new Image(),
    jump2: new Image()
  },
  tanutsuna: {
    idle: new Image(),
    run1: new Image(),
    run2: new Image(),
    jump1: new Image(),
    jump2: new Image()
  }
};

// まいの画像を読み込み
characterImages.mai.idle.src = "assets/mai.png";
characterImages.mai.run1.src = "assets/mai-run1.png";
characterImages.mai.run2.src = "assets/mai-run2.png";
characterImages.mai.jump1.src = "assets/mai-jump1.png";
characterImages.mai.jump2.src = "assets/mai-jump2.png";

// たぬつなの画像を読み込み（完成しているもののみ）
characterImages.tanutsuna.idle.src = "assets/tanutsuna.png";
characterImages.tanutsuna.run1.src = "assets/tanutsuna-run1.png";
characterImages.tanutsuna.run2.src = "assets/tanutsuna-run2.png";
characterImages.tanutsuna.jump1.src = "assets/tanutsuna-jump1.png";
characterImages.tanutsuna.jump2.src = "assets/tanutsuna-jump2.png";

// 画像読み込みエラーハンドリング
Object.values(characterImages).forEach(character => {
  Object.values(character).forEach(img => {
    if (img instanceof HTMLImageElement) {
      img.onerror = function() {
        console.warn('キャラクター画像読み込みエラー:', img.src);
        // エラー時はラフトの画像にフォールバック
        const fallbackImages = characterImages.raft;
        if (img === character.idle) img.src = fallbackImages.idle.src;
        else if (img === character.run1) img.src = fallbackImages.run1.src;
        else if (img === character.run2) img.src = fallbackImages.run2.src;
        else if (img === character.jump1) img.src = fallbackImages.jump1.src;
        else if (img === character.jump2) img.src = fallbackImages.jump2.src;
      };
    }
  });
});

// プレイヤー
const player = {
  x: 100, y: 100, width: 28, height: 28,
  vx: 0, vy: 0, speed: 3, jumpPower: -9,
  gravity: 0.5, onGround: false,
};
const respawnPoint = { x: 100, y: 100 };

// プレイヤーアニメーター
class PlayerAnimator {
  constructor() {
    this.frame = 0;
    this.timer = 0;
    this.justJumped = false;
    this.jumpFrameStart = 0;
    this.lastJumping = false;
    this.currentCharacter = 'raft';
  }
  
  setCharacter(character) {
    this.currentCharacter = character;
  }
  
  getCharacterImages() {
    const images = characterImages[this.currentCharacter] || characterImages.raft;
    
    // 画像の存在チェック（未完成の画像がある場合はラフトにフォールバック）
    const fallbackImages = characterImages.raft;
    return {
      idle: images.idle.complete && images.idle.naturalWidth > 0 ? images.idle : fallbackImages.idle,
      run1: images.run1.complete && images.run1.naturalWidth > 0 ? images.run1 : fallbackImages.run1,
      run2: images.run2.complete && images.run2.naturalWidth > 0 ? images.run2 : fallbackImages.run2,
      jump1: images.jump1.complete && images.jump1.naturalWidth > 0 ? images.jump1 : fallbackImages.jump1,
      jump2: images.jump2.complete && images.jump2.naturalWidth > 0 ? images.jump2 : fallbackImages.jump2
    };
  }
  
  update(moving, jumping) {
    const now = performance.now();
    if (moving && now - this.timer > 100) {
      this.frame++;
      this.timer = now;
    }
    if (jumping && !this.lastJumping) {
      this.justJumped = true;
      this.jumpFrameStart = now;
    }
    if (!jumping) this.justJumped = false;
    this.lastJumping = jumping;
  }
  
  draw(ctx, x, y, width, height, moving, flip, jumping) {
    const images = this.getCharacterImages();
    let img;
    const now = performance.now();
    
    if (this.justJumped) {
      const elapsed = now - this.jumpFrameStart;
      if (elapsed < 100) img = images.jump1;
      else if (elapsed < 200) img = images.jump2;
      else this.justJumped = false;
    }
    
    if (!img) {
      if (jumping) {
        const centerX = x + width / 2;
        const bottomY = y + height;
        const nearGround =
          getTile(centerX, bottomY + 1) !== 0 ||
          getTile(centerX, bottomY + 32) !== 0;
        img = nearGround ? images.jump1 : images.jump2;
      } else if (moving) {
        img = this.frame % 2 === 0 ? images.run1 : images.run2;
      } else {
        img = images.idle;
      }
    }
    
    ctx.save();
    if (flip) {
      ctx.translate(x + width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, width, height);
    } else {
      ctx.drawImage(img, x, y, width, height);
    }
    ctx.restore();
  }
}
const animator = new PlayerAnimator();

const keys = {};
let cameraX = 0, cameraY = 0;
let facingLeft = false;
let isMoving = false;
let isDead = false, deathStartTime = 0, useFallDeathScreen = false, showDeathScreen = false;
let cameraLockX = 0, cameraLockY = 0;
let deathFrozen = false;
let scoa = 0;

// 動く敵（アニメタイマー付き）
let enemyObjs = [];
function initEnemies() {
  enemyObjs = [];
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[0].length; col++) {
      if (map[row][col] === 9) {
        enemyObjs.push({
          x: col * TILE_SIZE,
          y: row * TILE_SIZE,
          vy: 0, // 重力速度を初期化
          dir: Math.random() < 0.5 ? -1 : 1,
          speed: 1.5,
          animTimer: Math.floor(Math.random() * 60) // スタートずらす
        });
        map[row][col] = 0; // マップ上から消す
      }
    }
  }
}
initEnemies();

function updateEnemies() {
  if (!enemyObjs || !Array.isArray(enemyObjs)) {
    console.warn("updateEnemies: enemyObjsが無効です");
    return;
  }
  
  for (const enemy of enemyObjs) {
    if (!enemy) continue;
    
    // 重力を追加
    enemy.vy += 0.5; // 重力
    enemy.y += enemy.vy;
    
    // 地面との衝突判定（より正確に）
    const enemyBottom = enemy.y + TILE_SIZE;
    const enemyCol = Math.floor(enemy.x / TILE_SIZE);
    const enemyRow = Math.floor(enemyBottom / TILE_SIZE);
    
    // 足元のタイルをチェック
    let onGround = false;
    if (enemyRow >= 0 && enemyRow < map.length && enemyCol >= 0 && enemyCol < map[0].length) {
      const tileBelow = map[enemyRow][enemyCol];
      // 地面として機能するタイル
      if (tileBelow === 1 || tileBelow === 2 || tileBelow === 5 || tileBelow === 11 || tileBelow === 3 || tileBelow === 6) {
        onGround = true;
      }
    }
    
    // 地面に着地
    if (onGround && enemy.vy > 0) {
      enemy.y = enemyRow * TILE_SIZE - TILE_SIZE;
      enemy.vy = 0;
    }
    
    // 水平移動
    enemy.x += enemy.speed * enemy.dir;
    enemy.animTimer = (enemy.animTimer || 0) + 1;
    
    // 足元と正面で折返し
    const aheadX = enemy.x + (enemy.dir > 0 ? TILE_SIZE : -2);
    const footY = enemy.y + TILE_SIZE;
    const tileAhead = getTile(aheadX, enemy.y);
    const tileBelowAhead = getTile(aheadX, footY);
    
    // より自然な折返し判定
    if (
      tileBelowAhead === 0 || // 足元が空
      tileAhead === 1 || tileAhead === 2 || tileAhead === 5 || tileAhead === 3 || tileAhead === 6 || // 正面にブロック
      enemy.x <= 0 || enemy.x + TILE_SIZE >= map[0].length * TILE_SIZE // マップ端
    ) {
      enemy.dir *= -1;
      enemy.x += enemy.speed * enemy.dir;
    }
  }
}

function drawEnemies() {
  if (!enemyObjs || !Array.isArray(enemyObjs)) {
    console.warn("drawEnemies: enemyObjsが無効です");
    return;
  }
  
  for (const enemy of enemyObjs) {
    if (!enemy) continue;
    
    const frame = Math.floor((enemy.animTimer || 0) / 10) % 2;
    const img = frame === 0 ? enemyMoveImg1 : enemyMoveImg2;
    ctx.drawImage(img, enemy.x, enemy.y, TILE_SIZE, TILE_SIZE);
  }
}

const deathGifEl = document.getElementById("deathGif");

// タイル取得
function getTile(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return 0;
  return map[row][col];
}

// 当たり判定チェック
function checkCollision(x, y, width, height) {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + width) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + height) / TILE_SIZE);
  
  // デバッグ用：当たり判定範囲を確認
  if (Math.abs(x - player.x) < 5 && Math.abs(y - player.y) < 5) {
    console.log("当たり判定範囲:", { left, right, top, bottom, x, y, width, height });
  }
  
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (row >= 0 && row < map.length && col >= 0 && col < map[0].length) {
        const tile = map[row][col];
        
        // 毒タイルの場合は当たり判定なし（完全にすり抜け可能）
        if (tile === 6) {
          continue; // 毒タイルの場合は判定をスキップ
        }
        
        // 当たり判定から除外するタイル:
        // 0: 空, 4: ゴール, 6: 毒, 7: トランポリン, 8: ハシゴ, 10: スポーン地点, 12-14: レール, 15: コイン, 16: チェックポイント, 17: ゴールドゴール, 19: ダミーブロック
        // 3: 敵はブロックとしての当たり判定あり、特殊効果は別途処理
        if (tile !== 0 && tile !== 4 && tile !== 6 && tile !== 7 && tile !== 8 && tile !== 10 && 
            tile !== 12 && tile !== 13 && tile !== 14 && 
            tile !== 15 && tile !== 16 && tile !== 17 && tile !== 19) {
          // デバッグ用：衝突したタイルを確認
          if (Math.abs(x - player.x) < 5 && Math.abs(y - player.y) < 5) {
            console.log("衝突タイル:", { row, col, tile });
          }
          return true;
        }
      }
    }
  }
  return false;
}

// チェックポイント管理
if (!window.checkpoints) window.checkpoints = [];
if (!window.lastCheckpointPos) window.lastCheckpointPos = {x: -1, y: -1};

// 死亡処理（death.gifも）
function diePlayer(reason) {
  isDead = true;
  deathStartTime = performance.now();
  cameraLockX = cameraX;
  cameraLockY = cameraY;

  // death.gif画面全体表示
  deathGifEl.style.display = "block";
  setTimeout(() => {
    deathGifEl.style.display = "none";
  }, 1000);

  // respawnPointからリスポーン（チェックポイントで更新済み）
  console.log("リスポーン位置:", respawnPoint.x, respawnPoint.y);
  player.x = respawnPoint.x;
  player.y = respawnPoint.y;
  player.vx = 0; player.vy = 0; player.onGround = false;
  for (let key in keys) keys[key] = false;
  deathFrozen = true;
}

// プレイヤー初期化時
const spawn = findSpawn();
player.x = spawn.x;
player.y = spawn.y - TILE_SIZE; // スポーン地点の1タイル上に配置
respawnPoint.x = spawn.x;
respawnPoint.y = spawn.y - TILE_SIZE; // リスポーン位置も調整

// デバッグ用：プレイヤー位置の確認
console.log("プレイヤー初期位置:", player.x, player.y);
console.log("スポーン位置:", spawn.x, spawn.y);

// プレイヤー周辺のタイル情報を確認
const playerCol = Math.floor(player.x / TILE_SIZE);
const playerRow = Math.floor(player.y / TILE_SIZE);
console.log("プレイヤー周辺タイル:");
for (let r = playerRow - 1; r <= playerRow + 2; r++) {
  let rowInfo = "";
  for (let c = playerCol - 1; c <= playerCol + 2; c++) {
    if (r >= 0 && r < map.length && c >= 0 && c < map[0].length) {
      const tile = map[r][c];
      const isDummy = tile === 19;
      const overlay = isDummy && window.dummyOverlays ? window.dummyOverlays[`${r},${c}`] : null;
      rowInfo += `[${tile}${overlay ? `(${overlay})` : ''}]`;
    } else {
      rowInfo += "[X]";
    }
  }
  console.log(`行${r}: ${rowInfo}`);
}

// イベント登録
document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

// タッチ操作対応
const touchControls = {
  left: false,
  right: false,
  jump: false
};

// タッチボタンのイベントリスナー
document.addEventListener('DOMContentLoaded', function() {
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const jumpBtn = document.getElementById('jumpBtn');
  
  if (leftBtn) {
    leftBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchControls.left = true;
    });
    leftBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchControls.left = false;
    });
    leftBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      touchControls.left = true;
    });
    leftBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      touchControls.left = false;
    });
  }
  
  if (rightBtn) {
    rightBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchControls.right = true;
    });
    rightBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchControls.right = false;
    });
    rightBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      touchControls.right = true;
    });
    rightBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      touchControls.right = false;
    });
  }
  
  if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchControls.jump = true;
    });
    jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchControls.jump = false;
    });
    jumpBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      touchControls.jump = true;
    });
    jumpBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      touchControls.jump = false;
    });
  }
});

// カメラズーム制御用変数
if (typeof window.dynamicScale === 'undefined') window.dynamicScale = SCALE;
let targetScale = SCALE;

// 設定の読み込み
function loadGameSettings() {
  const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
  const keySettings = JSON.parse(localStorage.getItem('keySettings') || '{}');
  
  const defaults = {
    cameraSpeed: 0.1,
    zoom: 2.0,
    difficulty: 'normal',
    character: 'raft'
  };
  
  // デフォルトキー設定
  const defaultKeys = {
    left: 'a',
    right: 'd',
    jump: ' ',
    up: 'w',
    down: 's',
    stop: 'Shift',
    editorLeft: 'a',
    editorRight: 'd',
    editorUp: 'w',
    editorDown: 's'
  };
  
  // カメラ追従速度
  window.cameraSpeed = settings.cameraSpeed !== undefined ? parseFloat(settings.cameraSpeed) : defaults.cameraSpeed;
  
  // ズーム倍率（設定値をそのまま使用）
  window.dynamicScale = settings.zoom !== undefined ? parseFloat(settings.zoom) : defaults.zoom;
  targetScale = window.dynamicScale;
  
  // 難易度設定
  window.gameDifficulty = settings.difficulty || defaults.difficulty;
  
  // キャラクター設定
  const selectedCharacter = settings.character || defaults.character;
  if (animator) {
    animator.setCharacter(selectedCharacter);
  }
  
  // キー設定
  window.gameKeys = {};
  Object.keys(defaultKeys).forEach(key => {
    window.gameKeys[key] = keySettings[key] || defaultKeys[key];
  });
  
  console.log('設定読み込み完了:', { 
    cameraSpeed: window.cameraSpeed, 
    zoom: window.dynamicScale, 
    difficulty: window.gameDifficulty,
    character: selectedCharacter,
    keys: window.gameKeys
  });
}
loadGameSettings();

// 設定変更時のリアルタイム反映
window.addEventListener('storage', (e) => {
  if (e.key === 'gameSettings' || e.key === 'keySettings') {
    console.log('設定が変更されました');
    loadGameSettings();
  }
});

// メイン更新
function update() {
  player.vx = 0; isMoving = false;
  
  // キー設定を使用した左右移動（キーボード + タッチ）
  const leftKey = window.gameKeys?.left || 'a';
  const rightKey = window.gameKeys?.right || 'd';
  
  // キーボード入力
  const keyboardLeft = keys[leftKey.toLowerCase()] || keys[leftKey.toUpperCase()] || keys["ArrowLeft"];
  const keyboardRight = keys[rightKey.toLowerCase()] || keys[rightKey.toUpperCase()] || keys["ArrowRight"];
  
  // タッチ入力
  const touchLeft = touchControls.left;
  const touchRight = touchControls.right;
  
  // 左右移動（キーボードまたはタッチのどちらかが押されている場合）
  if (keyboardLeft || touchLeft) { 
    player.vx = -player.speed; 
    facingLeft = true; 
    isMoving = true; 
  }
  if (keyboardRight || touchRight) { 
    player.vx = player.speed; 
    facingLeft = false; 
    isMoving = true; 
  }
  
  // デバッグ用：キー入力と移動状態を確認
  if (keyboardLeft || keyboardRight || touchLeft || touchRight) {
    console.log("入力状態:", {
      keyboardLeft,
      keyboardRight,
      touchLeft,
      touchRight,
      vx: player.vx,
      vy: player.vy,
      onGround: player.onGround
    });
  }

  // 移動・落下
  const nextX = player.x + player.vx;
  const collisionX = checkCollision(nextX, player.y, player.width, player.height);
  if (!collisionX) {
    player.x = nextX;
  } else {
    console.log("X軸移動ブロック:", player.x, player.y, "→", nextX, player.y);
  }
  
  player.vy += player.gravity;
  
  // 梯子停止の処理（梯子を登っている＆停止キーを押している場合）
  const ladderFootX = player.x + player.width / 2;
  const ladderFootY = player.y + player.height + 1;
  const ladderTileBelow = getTile(ladderFootX, ladderFootY);
  const stopKey = window.gameKeys?.stop || 'Shift';
  if (ladderTileBelow === 8 && (keys[stopKey] || keys["ShiftLeft"] || keys["ShiftRight"])) {
    player.vy = 0; // 落下を停止
  }
  
  const nextY = player.y + player.vy;
  const collisionY = checkCollision(player.x, nextY, player.width, player.height);
  if (!collisionY) {
    player.y = nextY;
    player.onGround = false;
  } else {
    if (player.vy > 0) player.onGround = true;
    player.vy = 0;
    console.log("Y軸移動ブロック:", player.x, player.y, "→", player.x, nextY);
  }

  // ハシゴの上面で自然に立てる
  const underTile = getTile(player.x + player.width / 2, player.y + player.height + 2);
  const nowTile = getTile(player.x + player.width / 2, player.y + player.height / 2);
  if (underTile === 8 && nowTile !== 8) {
    player.onGround = true;
    player.vy = 0;
  }

  if (!isDead) {
    // プレイヤーがx軸でほぼ中心に来るようにカメラ調整
    const centerOffsetX = 0.0; // 0.0:完全中心, 0.1:少し左寄り
    cameraX = player.x + player.width / 2 - canvas.width / (2 * window.dynamicScale) - (canvas.width * centerOffsetX / window.dynamicScale);
    cameraY = player.y + player.height / 2 - canvas.height / (2 * window.dynamicScale);
    const mapPixelHeight = map.length * TILE_SIZE;
    const viewHeight = canvas.height / window.dynamicScale;
    const maxCameraY = mapPixelHeight - viewHeight;
    if (cameraY > maxCameraY - 32) cameraY = Math.min(cameraY, maxCameraY);
    if (cameraY < 0) cameraY = 0;
  } else {
    cameraX = cameraLockX;
    cameraY = cameraLockY;
  }
  if (cameraX < 0) cameraX = 0;
  animator.update(isMoving, !player.onGround);

  // 敵移動
  updateEnemies();

  // 動く敵との当たり判定と物理演算
  let onEnemy = false;
  let enemiesToRemove = []; // 削除する敵のインデックスを保存
  
  // enemyObjsの存在チェック
  if (!enemyObjs || !Array.isArray(enemyObjs)) {
    enemyObjs = [];
    console.warn("enemyObjsが初期化されていません。再初期化します。");
  }
  
  for (let i = 0; i < enemyObjs.length; i++) {
    const enemy = enemyObjs[i];
    
    // enemyオブジェクトの存在チェック
    if (!enemy) {
      console.warn("無効な敵オブジェクトをスキップします:", i);
      continue;
    }
    
    // 落下ブロックとの衝突判定（敵の上に落下ブロックが落ちてきた時）
    if (window.fallingBreaks && Array.isArray(window.fallingBreaks)) {
      for (let j = window.fallingBreaks.length - 1; j >= 0; j--) {
        const fb = window.fallingBreaks[j];
        if (!fb) continue;
        
        if (
          fb.col * TILE_SIZE + TILE_SIZE > enemy.x &&
          fb.col * TILE_SIZE < enemy.x + TILE_SIZE &&
          fb.y + TILE_SIZE > enemy.y &&
          fb.y < enemy.y + TILE_SIZE &&
          fb.vy > 0 // 落下中の場合のみ
        ) {
          // 敵を倒す！
          enemiesToRemove.push(i);
          window.fallingBreaks.splice(j, 1);
          scoa += 300; // 敵を倒したスコア
          console.log("落下ブロックで敵を倒した！ +300点");
          break;
        }
      }
    }
    
    // プレイヤーが敵の上に乗っているかチェック
    if (
      player.x + player.width > enemy.x &&
      player.x < enemy.x + TILE_SIZE &&
      Math.abs((player.y + player.height) - enemy.y) < 5 && // 5px以内なら上に乗っている
      player.vy >= 0 // 落下中または静止中
    ) {
      onEnemy = true;
      player.y = enemy.y - player.height; // 敵の上に配置
      player.vy = 0;
      player.onGround = true;
      
      // 敵の移動に合わせてプレイヤーも移動
      player.x += enemy.speed * enemy.dir;
    }
    
    // 横からの接触判定（死亡）
    else if (
      player.x + player.width > enemy.x &&
      player.x < enemy.x + TILE_SIZE &&
      player.y + player.height > enemy.y &&
      player.y < enemy.y + TILE_SIZE
    ) {
      if (!isDead) diePlayer("enemyMove");
    }
  }
  
  // 削除対象の敵を後から削除（インデックスを降順で削除）
  for (let i = enemiesToRemove.length - 1; i >= 0; i--) {
    if (enemyObjs[enemiesToRemove[i]]) {
      enemyObjs.splice(enemiesToRemove[i], 1);
    }
  }

  // --- タイルごとの判定 ---
  const footX = player.x + player.width / 2;
  const footY = player.y + player.height + 1;
  const tileBelow = getTile(footX, footY);

  // --- breakable block timer ---
  if (!window.breakTimers) window.breakTimers = {};
  if (!window.fallingBreaks) window.fallingBreaks = [];
  if (!window.breakRespawns) window.breakRespawns = [];
  const colBelow = Math.floor(footX / TILE_SIZE);
  const rowBelow = Math.floor(footY / TILE_SIZE);
  if (tileBelow === 11) {
    const key = rowBelow + "," + colBelow;
    if (!window.breakTimers[key]) {
      window.breakTimers[key] = performance.now();
    }
  }
  // 全ての落下ブロックのタイマーをチェック（プレイヤーが乗っていなくても）
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[0].length; col++) {
      if (map[row][col] === 11) {
        const key = row + "," + col;
        if (window.breakTimers[key]) {
      const elapsed = performance.now() - window.breakTimers[key];
      if (elapsed > 500) {
            // 落下開始: fallingBreaksに追加
            window.fallingBreaks.push({
              row: row,
              col: col,
              y: row * TILE_SIZE,
              vy: 0
            });
            map[row][col] = 0;
        delete window.breakTimers[key];
          }
        }
      }
    }
  }

  // --- falling breakable blocks update ---
  console.log("落下ブロックの数:", window.fallingBreaks.length);
  for (let i = window.fallingBreaks.length - 1; i >= 0; i--) {
    const fb = window.fallingBreaks[i];
    console.log("落下ブロック処理中:", i, fb.row, fb.col, fb.y, fb.fading);
    fb.vy += 0.5; // gravity
    fb.y += fb.vy;
    const nextRow = Math.floor((fb.y + TILE_SIZE) / TILE_SIZE);
    
    // 動く敵との衝突判定
    let hitEnemy = false;
    for (let j = enemyObjs.length - 1; j >= 0; j--) {
      const enemy = enemyObjs[j];
      if (
        fb.col * TILE_SIZE + TILE_SIZE > enemy.x &&
        fb.col * TILE_SIZE < enemy.x + TILE_SIZE &&
        fb.y + TILE_SIZE > enemy.y &&
        fb.y < enemy.y + TILE_SIZE
      ) {
        // 敵を倒す！
        enemyObjs.splice(j, 1);
        hitEnemy = true;
        scoa += 300; // 敵を倒したスコア
        console.log("敵を倒した！ +300点");
        break;
      }
    }
    
    if (hitEnemy) {
      // 敵を倒した場合は落下ブロックも消す
      window.fallingBreaks.splice(i, 1);
      continue;
    }
    
    if (nextRow >= map.length || (nextRow >= 0 && map[nextRow][fb.col] !== 0)) {
      // 地面に着いたらフェードアウト開始（一度だけ）
      if (!fb.fading) {
        console.log("地面に着地、フェードアウト開始:", fb.row, fb.col, "nextRow:", nextRow, "map[nextRow][fb.col]:", map[nextRow] ? map[nextRow][fb.col] : "undefined");
        fb.fading = true;
        fb.alpha = 1.0;
        fb.fadeTimer = 0;
      }
    }
    if (fb.fading) {
      console.log("フェードアウト処理開始:", fb.row, fb.col, "現在のfadeTimer:", fb.fadeTimer, "現在のalpha:", fb.alpha);
      fb.fadeTimer += 1;
      fb.alpha -= 0.1; // 0.03 → 0.1 に変更してフェードアウトを速くする
      console.log("フェードアウト中:", fb.row, fb.col, "alpha:", fb.alpha, "fadeTimer:", fb.fadeTimer);
      
      // フェードアウト完了条件を複数設定
      if (fb.alpha <= 0 || fb.fadeTimer >= 3) { // タイマーを3フレームに短縮
        console.log("フェードアウト完了条件達成:", fb.row, fb.col, "alpha:", fb.alpha, "fadeTimer:", fb.fadeTimer);
        // 復活待ちリストに追加
        window.breakRespawns.push({row: fb.row, col: fb.col, timer: 300}); // 5秒(60fps)
        console.log("復活待ちリストに追加:", fb.row, fb.col, "現在の復活待ち数:", window.breakRespawns.length);
        window.fallingBreaks.splice(i, 1);
        continue;
      }
    }
  }
  // --- breakable block respawn ---
  console.log("復活待ちリストの数:", window.breakRespawns.length);
  for (let i = window.breakRespawns.length - 1; i >= 0; i--) {
    const br = window.breakRespawns[i];
    console.log("復活処理中:", i, br.row, br.col, br.timer);
    br.timer--;
    if (br.timer <= 0) {
      map[br.row][br.col] = 11;
      console.log("ブロック復活完了:", br.row, br.col, "マップ値:", map[br.row][br.col]);
      window.breakRespawns.splice(i, 1);
  } else {
      console.log("復活タイマー:", br.row, br.col, "残り", br.timer);
    }
  }

  // --- タイルごとの判定 ---
  // 敵の死亡判定（プレイヤーが敵の上に乗った時のみ）
  const playerBottom = player.y + player.height;
  const playerCenterX = player.x + player.width / 2;
  
  // プレイヤーの足元のタイルをチェック
  const tileBelowPlayer = getTile(playerCenterX, playerBottom + 1);
  if (tileBelowPlayer === 3 && !isDead) {
    diePlayer("enemy");
    return;
  }
  
  // トランポリンの拡張判定（プレイヤーの下部周辺）
  const playerLeft = player.x - 8; // プレイヤーの左右8px拡張
  const playerRight = player.x + player.width + 8;
  const trampolineTop = player.y + player.height - 8; // プレイヤーの下部8px拡張
  const trampolineBottom = player.y + player.height + 16; // さらに下16px拡張
  
  for (let row = Math.floor(trampolineTop / TILE_SIZE); row <= Math.floor(trampolineBottom / TILE_SIZE); row++) {
    for (let col = Math.floor(playerLeft / TILE_SIZE); col <= Math.floor(playerRight / TILE_SIZE); col++) {
      if (row >= 0 && row < map.length && col >= 0 && col < map[0].length) {
        const tile = map[row][col];
        if (tile === 7 && player.vy > 0 && !isDead) {
          player.vy = player.jumpPower * 1.7; // トランポリン効果
        }
      }
    }
  }
  
  // プレイヤー中心座標
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  const tileAtCenter = getTile(centerX, centerY);
  if (tileAtCenter === 6 && !isDead) {
    diePlayer("poison");
    return;
  }
  
  // ハシゴの判定（当たり判定なしになったので特殊効果のみ）
  const bodyX = player.x + player.width / 2;
  const bodyY = player.y + player.height / 2;
  const tileAtBody = getTile(bodyX, bodyY);
  
  if (tileAtBody === 8) {
    // キー設定を使用した梯子上昇・下降の処理
    const ladderUpKey = window.gameKeys?.ladderUp || 'w';
    const downKey = window.gameKeys?.down || 's';
    const stopKey = window.gameKeys?.stop || 'Shift';
    
    if (keys[ladderUpKey.toLowerCase()] || keys[ladderUpKey.toUpperCase()] || keys["ArrowUp"]) {
      player.vy = -2; // 上昇
    } else if (keys[downKey.toLowerCase()] || keys[downKey.toUpperCase()] || keys["ArrowDown"]) {
      player.vy = 2; // 下降
    } else if (keys[stopKey] || keys["ShiftLeft"] || keys["ShiftRight"]) {
      player.vy = 0; // シフトで落下停止
    } else {
      player.vy = 0; // 何も押していない時は停止
    }
    player.onGround = true;
  }
  
  // ハシゴに登っている時はハシゴ上昇キーでのジャンプを無効にする
  const ladderUpKey = window.gameKeys?.ladderUp || 'w';
  if (tileAtBody === 8 && (keys["ArrowUp"] || keys[ladderUpKey.toLowerCase()] || keys[ladderUpKey.toUpperCase()])) {
    // ハシゴ上昇キーでのジャンプ入力を無視（梯子上昇を優先）
    // ジャンプ処理をスキップするため、ここでは何もしない
  }
  
  // ジャンプ（スペースキーのみ）
  const jumpKey = window.gameKeys?.jump || ' ';
  
  // キーボード入力
  const keyboardJump = keys[jumpKey];
  const keyboardUp = keys["ArrowUp"];
  
  // タッチ入力
  const touchJump = touchControls.jump;
  
  // ジャンプキーが↑に設定されている場合は↑キーのみでジャンプ
  if (jumpKey === 'ArrowUp') {
    if ((keyboardJump || keyboardUp || touchJump) && player.onGround && tileAtBody !== 8) {
      player.vy = player.jumpPower;
      player.onGround = false;
    }
  } else {
    // 通常のジャンプ処理（スペースキーまたはタッチ）
    if ((keyboardJump || touchJump) && player.onGround && tileAtBody !== 8) {
      player.vy = player.jumpPower;
      player.onGround = false;
    }
  }
  
  // 胴体判定（プレイヤーの中心部分）
  if (tileAtBody === 15) {
    scoa += 100;
    const col = Math.floor(bodyX / TILE_SIZE);
    const row = Math.floor(bodyY / TILE_SIZE);
    if (map[row] && map[row][col] === 15) map[row][col] = 0;
  }
  if (tileAtBody === 16) {
    // 前回のチェックポイント位置との距離をチェック
    const dist = Math.sqrt((player.x - window.lastCheckpointPos.x) ** 2 + (player.y - window.lastCheckpointPos.y) ** 2);
    if (dist > 32) { // 32px以上離れている場合のみ新しいチェックポイントとして設定
      respawnPoint.x = player.x;
      respawnPoint.y = player.y;
      window.lastCheckpointPos.x = player.x;
      window.lastCheckpointPos.y = player.y;
      console.log("チェックポイント設定:", respawnPoint.x, respawnPoint.y);
    }
  }
  // 落下死
  const fallThreshold = map.length * TILE_SIZE + 64;
  if (player.y > fallThreshold && !isDead) {
    isDead = true;
    deathStartTime = performance.now();
    useFallDeathScreen = true;
    player.x = respawnPoint.x;
    player.y = respawnPoint.y;
    player.vx = 0; player.vy = 0;
    player.onGround = false;
    for (let key in keys) keys[key] = false;
    deathFrozen = true;
    cameraLockX = cameraX;
    cameraLockY = cameraY;
    return;
  }

  // ゴール
  if (tileAtBody === 4) {
    scoa += 500;
    const col = Math.floor(bodyX / TILE_SIZE);
    const row = Math.floor(bodyY / TILE_SIZE);
    if (map[row] && map[row][col] === 4) map[row][col] = 0;
  }
  // ゴールドゴール
  if (tileAtBody === 17) {
    scoa += 2000;
    const col = Math.floor(bodyX / TILE_SIZE);
    const row = Math.floor(bodyY / TILE_SIZE);
    if (map[row] && map[row][col] === 17) map[row][col] = 0;
  }

  // 土と草の変換処理（0.5秒間に一度）
  if (!window.groundDirtTimer) window.groundDirtTimer = 0;
  window.groundDirtTimer++;
  if (window.groundDirtTimer >= 30) { // 60fps * 0.5秒 = 30フレーム
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[0].length; c++) {
        if (map[r][c] === 1 && r > 0 && map[r-1][c] !== 0) {
          // スコアをゲットできるブロック、チェックポイント、スポーン地点、動く敵は除外
          const tileAbove = map[r-1][c];
          if (tileAbove !== 4 && tileAbove !== 15 && tileAbove !== 16 && tileAbove !== 17 && tileAbove !== 10 && tileAbove !== 3) {
            map[r][c] = 2; // groundの上に何かあればdirtに変換
          }
        }
        if (map[r][c] === 2 && (r === 0 || map[r-1][c] === 0)) {
          map[r][c] = 1; // dirtの上に何もなければgroundに変換
        }
      }
    }
    window.groundDirtTimer = 0;
  }

  if (isDead) {
    const elapsed = performance.now() - deathStartTime;
    if (useFallDeathScreen) {
      if (elapsed >= 100) {
        isDead = false;
        showDeathScreen = false;
        useFallDeathScreen = false;
        deathFrozen = false;
      }
      return;
    }
    if (elapsed >= 1000 && !showDeathScreen) showDeathScreen = true;
    if (elapsed >= 2000) {
      isDead = false;
      showDeathScreen = false;
      useFallDeathScreen = false;
      deathFrozen = false;
    }
    return;
  }

  // カメラは常にプレイヤー中心
  cameraX += (player.x + player.width / 2 - cameraX - canvas.width / (2 * window.dynamicScale)) * window.cameraSpeed;
  cameraY += (player.y + player.height / 2 - cameraY - canvas.height / (2 * window.dynamicScale)) * window.cameraSpeed;
  // カメラ制限
  cameraX = Math.max(0, Math.min(cameraX, map[0].length * TILE_SIZE - canvas.width / window.dynamicScale));
  cameraY = Math.max(0, Math.min(cameraY, map.length * TILE_SIZE - canvas.height / window.dynamicScale));
}

// 描画
function draw() {
  ctx.setTransform(window.dynamicScale, 0, 0, window.dynamicScale, -cameraX * window.dynamicScale, -cameraY * window.dynamicScale);
  ctx.clearRect(cameraX, cameraY, canvas.width / window.dynamicScale, canvas.height / window.dynamicScale);
  ctx.fillStyle = "#aee";
  ctx.fillRect(cameraX, cameraY, canvas.width / window.dynamicScale, canvas.height / window.dynamicScale);
  // まずレールだけ描画
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[0].length; col++) {
      const tile = map[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      if (tile === 12) ctx.drawImage(rail1Img, x, y, TILE_SIZE, TILE_SIZE);
      else if (tile === 13) {
        const left = col > 0 && map[row][col-1] >= 12 && map[row][col-1] <= 14;
        if (left) ctx.drawImage(rail2Img, x, y, TILE_SIZE, TILE_SIZE);
        else {
          ctx.save();
          ctx.translate(x + TILE_SIZE, y);
          ctx.scale(-1, 1);
          ctx.drawImage(rail2Img, 0, 0, TILE_SIZE, TILE_SIZE);
          ctx.restore();
        }
      } else if (tile === 14) ctx.drawImage(rail3Img, x, y, TILE_SIZE, TILE_SIZE);
    }
  }
  // 落下中の壊れるブロック描画
  if (window.fallingBreaks) {
    for (const fb of window.fallingBreaks) {
      ctx.save();
      if (fb.fading) ctx.globalAlpha = Math.max(0, fb.alpha);
      ctx.drawImage(breakableImg, fb.col * TILE_SIZE, fb.y, TILE_SIZE, TILE_SIZE);
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
  }
  // 次に他のタイルを描画
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[0].length; col++) {
      const tile = map[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      
      // ダミーブロックの場合は元のブロックの見た目で描画
      let drawTile = tile;
      if (tile === 19 && window.dummyOverlays && window.dummyOverlays[`${row},${col}`]) {
        drawTile = window.dummyOverlays[`${row},${col}`];
      }
      
      if (drawTile === 1) ctx.drawImage(groundImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 2) ctx.drawImage(dirtImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 3) ctx.drawImage(enemyImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 4) ctx.drawImage(goalImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 5) ctx.drawImage(stoneImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 6) ctx.drawImage(poisonImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 7) ctx.drawImage(trampolineImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 8) ctx.drawImage(ladderImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 11) ctx.drawImage(breakableImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 15) ctx.drawImage(coinImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 16) ctx.drawImage(checkpointImg, x, y, TILE_SIZE, TILE_SIZE);
      else if (drawTile === 17) ctx.drawImage(goldgoalImg, x, y, TILE_SIZE, TILE_SIZE);
    }
  }
  drawEnemies();
  if (!deathFrozen) {
    animator.draw(ctx, player.x, player.y, player.width, player.height, isMoving, facingLeft, !player.onGround);
  }
  if (useFallDeathScreen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(deathScreenFallImg, 0, 0, canvas.width, canvas.height);
  } else if (showDeathScreen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(deathScreenImg, 0, 0, canvas.width, canvas.height);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Arial";
  ctx.fillText(`SCORE: ${scoa}`, canvas.width - 160, 30);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

Promise.all([
  new Promise(resolve => groundImg.onload = resolve),
  new Promise(resolve => dirtImg.onload = resolve),
  new Promise(resolve => enemyImg.onload = resolve),
  new Promise(resolve => goalImg.onload = resolve),
  new Promise(resolve => stoneImg.onload = resolve),
  new Promise(resolve => poisonImg.onload = resolve),
  new Promise(resolve => trampolineImg.onload = resolve),
  new Promise(resolve => ladderImg.onload = resolve),
  new Promise(resolve => enemyMoveImg1.onload = resolve),
  new Promise(resolve => enemyMoveImg2.onload = resolve),
  new Promise(resolve => breakblockImg.onload = resolve), // breakable block
  new Promise(resolve => rail1Img.onload = resolve),
  new Promise(resolve => rail2Img.onload = resolve),
  new Promise(resolve => rail3Img.onload = resolve),
  new Promise(resolve => coinImg.onload = resolve),
  new Promise(resolve => checkpointImg.onload = resolve),
  new Promise(resolve => goldgoalImg.onload = resolve),
]).then(() => {
  gameLoop();
});

function findSpawn() {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[0].length; c++) {
      if (map[r][c] === 10) {
        return { x: c * TILE_SIZE, y: r * TILE_SIZE };
      }
    }
  }
  return { x: 100, y: 100 }; // デフォルト
}

// --- サムネイル保存ボタンを削除 ---
const oldThumbBtn = document.getElementById('saveThumbBtn');
if (oldThumbBtn) oldThumbBtn.remove();

const homeBtn = document.getElementById("backHomeBtn");
if (homeBtn) {
  homeBtn.onclick = () => {
    location.href = "home.html";
  };
}
