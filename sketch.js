// ============================================================
// 第六階段（進階）：草原上的小怪物大戰
// 兩種小怪物、靠近觸發動畫與對話框、被擊倒與生命值
// ============================================================

// ---------- 1. 精靈圖資料（寬、高、張數都是我自己合併後的圖） ----------
// 每一張都是「橫向精靈圖」：w＝整張圖的寬、h＝高、n＝張數，單格寬＝w ÷ n
const SPR = {
  stop: { file: '1/stop/stop1.png', w: 72, h: 27, n: 3 },    // 站著不動（3 張）
  walk: { file: '1/walk/walk1.png', w: 156, h: 30, n: 6 },   // 走路（6 張）
  run: { file: '1/run/run1.png', w: 96, h: 27, n: 3 },       // 跑步（3 張）
  jump: { file: '1/jump/jump1.png', w: 96, h: 28, n: 3 },   // 跳起來（3 張）
  push: { file: '1/push/push1.png', w: 96, h: 27, n: 3 },   // 發功（3 張）
  to: { file: '1/to/to1.png', w: 32, h: 6, n: 2 },          // 特效：飛出去的火焰（2 張）
  boom: { file: '1/boom/boom1.png', w: 16, h: 16, n: 1 },   // 特效：命中時的爆炸（1 張）
  fall: { file: '1/fall/fall1.png', w: 30, h: 13, n: 1 },   // 倒下（1 張）
  win: { file: '1/win/win1.png', w: 132, h: 31, n: 4 },     // 勝利舞步（4 張）
  slimeWalk: { file: '2/walk/walk1.png', w: 100, h: 19, n: 4 },     // 史萊姆：走路（4 張）
  slimeTouch: { file: '2/touch/touch1.png', w: 78, h: 19, n: 3 },   // 史萊姆：生氣衝撞（3 張）
  slimeFall: { file: '2/fall/fall1.png', w: 78, h: 12, n: 3 },      // 史萊姆：被打倒（3 張）
  mushWalk: { file: '3/walk/walk1.png', w: 92, h: 24, n: 4 },       // 蘑菇怪：走路（4 張）
  mushTouch: { file: '3/touch/touch1.png', w: 69, h: 20, n: 3 },    // 蘑菇怪：生氣衝撞（3 張）
  mushFall: { file: '3/fall/fall1.png', w: 66, h: 23, n: 3 }        // 蘑菇怪：被打倒（3 張）
};

// ---------- 2. 全域變數 ----------
let S = 3;               // 放大倍率：像素風小圖要放大幾倍來看
let WW = 0, WH = 0;      // 「遊戲世界」的寬與高（畫布寬高 ÷ S）
let groundY = 0;         // 地面的高度（角色的腳踩在這一條線上）
let clouds = [];         // 雲
let tufts = [];          // 草叢與小花（位置固定，視窗改變時重新產生）
let player = { x: 0, y: 0, vy: 0, dir: 1, state: 'stop', t: 0, kx: 0 };  // 影子洛奇亞：位置、方向、目前動作
const WALK = 1.2, RUN = 2.2;       // 走路與跑步的速度（每一幀移動幾格）
const GRAV = 0.32, JUMP_V = -5.2;  // 重力，以及跳起來的初速度（往上是負的）
let fireballs = [];                // 飛出去的火焰
let monsters = [];                 // 場上的小怪物
let booms = [];                    // 爆炸特效
let hp = 3, score = 0, inv = 0;    // 生命、擊倒數、受傷後的無敵時間
let gameState = 'play';            // 遊戲狀態：play（進行中）、lose（戰敗）、win（勝利）
let spawnTimer = 60, introOn = true, introT = 0;   // 怪物出現計時、開場對話框
const GOAL = 10;                   // 擊倒幾隻就獲勝

// ---------- 3. 載入圖片 ----------
// 圖片讀不到時，在畫面上顯示原因，不要一直停在 Loading...
function showLoadError(file) {
  if (document.getElementById('loadErr')) return;
  document.body.insertAdjacentHTML('beforeend', '<p id="loadErr" style="position:fixed;top:8px;left:8px;margin:0;padding:10px;background:#fff;font:16px sans-serif">讀不到圖片：' + file + '<br>請用 VS Code 的 Live Server 或 GitHub Pages 開啟，並確認資料夾 1、2、3 和 index.html 在同一層</p>');
}

function preload() {
  for (let key in SPR) {
    // 直接雙擊開啟（file://）時，瀏覽器不讓 p5 讀圖，所以改用 images_data.js 內嵌的備用圖
    let src = (location.protocol === 'file:' && typeof IMG_DATA !== 'undefined') ? IMG_DATA[SPR[key].file] : SPR[key].file;
    SPR[key].img = loadImage(src, null, () => showLoadError(SPR[key].file));   // 把每一張橫向精靈圖載入進來；讀不到就顯示提醒
    SPR[key].cw = SPR[key].w / SPR[key].n;     // 算出單格寬（總寬 ÷ 張數）
  }
}

// ---------- 4. 建立畫布 ----------
function setup() {
  createCanvas(windowWidth, windowHeight);   // 全視窗畫布
  noSmooth();                                // 放大像素圖時不要變模糊
  updateWorld();
  makeScenery();
  player.x = WW / 2;                        // 洛奇亞站在畫面中間
  player.y = groundY;                       // 腳踩在地面上
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);   // 視窗大小改變時，畫布跟著改變
  noSmooth();                                // 重設畫布後要再關一次平滑，像素圖才不會變模糊
  updateWorld();
  makeScenery();
  player.x = constrain(player.x, 12, WW - 12);
  player.y = groundY;
  player.vy = 0;
}

// 依視窗大小算出放大倍率、世界大小與地面高度
function updateWorld() {
  S = constrain(min(floor(height / 160), floor(width / 150)), 2, 6);
  WW = width / S;
  WH = height / S;
  groundY = floor(WH * 0.8);
}

// 產生雲、草叢與小花
function makeScenery() {
  clouds = [
    { x: WW * 0.15, y: 22, s: 1.0, v: 0.04 },
    { x: WW * 0.55, y: 40, s: 0.8, v: 0.03 },
    { x: WW * 0.85, y: 16, s: 1.2, v: 0.05 }
  ];
  tufts = [];
  for (let i = 0; i < WW / 5; i++) {
    tufts.push({ x: random(WW), y: random(groundY - 8, WH), flower: random() < 0.3, c: floor(random(3)) });
  }
}

// ---------- 5. 每一幀的主畫面 ----------
function draw() {
  push();
  scale(S);                 // 之後畫的東西都放大 S 倍
  drawBackground();
  if (gameState === 'play') spawnMonsters();
  updateMonsters();
  updatePlayer();
  updateFireballs();
  updateBooms();
  drawMonsters();
  drawPlayer();
  drawFireballs();
  drawBooms();
  pop();
  drawHUD();
}

// ---------- 6. 背景：天空、太陽、雲、山丘、草地 ----------
function drawBackground() {
  noStroke();
  // 天空：由上到下慢慢變淡
  for (let y = 0; y < groundY; y += 2) {
    const t = y / groundY;
    fill(lerp(110, 210, t), lerp(190, 240, t), lerp(250, 255, t));
    rect(0, y, WW, 2);
  }
  // 太陽（外圈淡、內圈亮）
  fill(255, 245, 190, 110); ellipse(WW - 38, 34, 40, 40);
  fill(255, 236, 140); ellipse(WW - 38, 34, 26, 26);
  // 雲：慢慢往右飄，飄出畫面就從左邊回來
  for (let c of clouds) {
    c.x += c.v;
    if (c.x > WW + 30) c.x = -40;
    fill(255, 255, 255, 235);
    ellipse(c.x, c.y, 26 * c.s, 10 * c.s);
    ellipse(c.x - 9 * c.s, c.y + 2, 16 * c.s, 8 * c.s);
    ellipse(c.x + 10 * c.s, c.y + 2, 18 * c.s, 8 * c.s);
    ellipse(c.x + 2 * c.s, c.y - 4 * c.s, 14 * c.s, 9 * c.s);
  }
  // 遠方的山丘
  fill(128, 196, 140);
  for (let x = 0; x < WW; x += 2) {
    const h = 16 + 9 * sin(x * 0.045) + 5 * sin(x * 0.13 + 1);
    rect(x, groundY - 12 - h, 2, h + 2);
  }
  // 草地，加上一條一條的深色草紋
  fill(112, 196, 92);
  rect(0, groundY - 12, WW, WH - groundY + 12);
  fill(98, 180, 82);
  for (let y = groundY - 12; y < WH; y += 8) rect(0, y, WW, 3);
  // 草叢與小花
  const FLOWER = [[255, 120, 150], [255, 214, 90], [250, 250, 250]];
  for (let t of tufts) {
    if (t.flower) {
      fill(FLOWER[t.c][0], FLOWER[t.c][1], FLOWER[t.c][2]);
      rect(t.x, t.y, 2, 2);
      fill(255, 200, 60);
      rect(t.x + 0.5, t.y + 0.5, 1, 1);
    } else {
      fill(70, 150, 70);
      rect(t.x, t.y, 1, 3);
      rect(t.x + 2, t.y + 1, 1, 2);
    }
  }
}

// ---------- 7. 畫精靈圖的小工具 ----------
// 畫出精靈圖 s 的第 frame 格。(x, y) 是腳底的中央；dir＝1 朝右、-1 朝左（左右翻轉）
function drawSprite(s, frame, x, y, dir = 1, alpha = 255, sc = 1) {
  push();
  translate(round(x), round(y));
  scale(dir * sc, sc);
  if (alpha < 255) tint(255, alpha);
  // image(圖, 要畫的位置與大小, 從圖上要切的位置與大小)：只切出第 frame 格
  image(s.img, -s.cw / 2, -s.h, s.cw, s.h, frame * s.cw, 0, s.cw, s.h);
  pop();
}

// ---------- 8. 洛奇亞 ----------
function updatePlayer() {
  player.t++;                                       // 動畫計時器：每一幀加 1
  const alive = gameState === 'play';
  const onGround = player.y >= groundY;             // 腳底有沒有碰到地面
  if (player.state === 'push') {                    // 發功中：播放 3 格動畫，第 3 格時把火焰發射出去
    if (player.t === 14) fireFireball();
    if (player.t >= 26) { player.state = 'stop'; player.t = 0; }
  }
  const busy = player.state === 'push';

  // 左右鍵：移動並轉向；按住 Shift 變成跑步
  let moving = false, running = false;
  if (alive && !busy) {
    if (keyIsDown(RIGHT_ARROW)) { player.dir = 1; moving = true; }
    if (keyIsDown(LEFT_ARROW)) { player.dir = -1; moving = true; }
    running = moving && keyIsDown(SHIFT);
    if (moving) player.x += player.dir * (running ? RUN : WALK);
  }
  player.x += player.kx;                           // 受傷時被撞退
  player.kx *= 0.85;
  player.x = constrain(player.x, 12, WW - 12);     // 不要走出畫面

  // 重力：不在地面時一直往下掉
  if (!onGround || player.vy < 0) {
    player.vy += GRAV;
    player.y += player.vy;
    if (player.y >= groundY) { player.y = groundY; player.vy = 0; }
  }

  // 決定現在是哪一個動作
  let next = 'stop';
  if (moving) next = running ? 'run' : 'walk';
  if (player.y < groundY) next = 'jump';
  if (busy) next = 'push';
  if (next !== player.state) { player.state = next; player.t = 0; }
  if (inv > 0) inv--;
}

// 往上鍵：地面上才可以跳
function startJump() {
  if (player.y >= groundY && player.state !== 'push') player.vy = JUMP_V;
}

// 空白鍵：開始發功
function startPush() {
  if (player.state !== 'push') { player.state = 'push'; player.t = 0; }
}

// 現在這一幀要畫哪一格
function playerFrame() {
  const st = player.state;
  if (st === 'stop') return floor(player.t / 14) % SPR.stop.n;          // 每 14 幀換一格
  if (st === 'walk') return floor(player.t / 6) % SPR.walk.n;
  if (st === 'run') return floor(player.t / 4) % SPR.run.n;
  if (st === 'jump') return player.vy < -1 ? 0 : (player.vy > 1 ? 2 : 1); // 上升、最高點、下降
  if (st === 'push') return min(2, floor(player.t / 7));                 // 每 7 幀換一格，停在第 3 格
  return 0;
}

function drawPlayer() {
  // 腳底的陰影（跳起來時會留在地面，才看得出跳多高）
  noStroke(); fill(0, 0, 0, 45);
  ellipse(player.x, groundY + 1, 20, 4);
  if (gameState === 'lose') { drawSprite(SPR.fall, 0, player.x, player.y, player.dir); return; }
  if (gameState === 'win') { drawSprite(SPR.win, floor(frameCount / 8) % SPR.win.n, player.x, player.y); return; }
  const flicker = inv > 0 && floor(inv / 5) % 2 === 0;       // 受傷後閃爍
  const s = SPR[player.state];
  drawSprite(s, playerFrame(), player.x, player.y, player.dir, flicker ? 90 : 255);
}

// ---------- 9. 火焰（特效 to） ----------
function fireFireball() {
  // 從洛奇亞的嘴巴發射，朝它面對的方向飛
  fireballs.push({ x: player.x + player.dir * 19, y: player.y - 18, dir: player.dir, t: 0 });
}
function updateFireballs() {
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const f = fireballs[i];
    f.x += f.dir * 3.4;
    f.t++;
    for (let m of monsters) {                         // 打到小怪物就把牠擊倒
      if (m.state !== 'fall' && abs(f.x - m.x) < 10 && f.y > m.y - m.h - 8 && f.y < m.y + 3) {
        defeat(m);
        booms.push({ x: m.x, y: m.y - m.h / 2, t: 0 });
        f.x = -999;
      }
    }
    if (f.x < -12 || f.x > WW + 12) fireballs.splice(i, 1);   // 飛出畫面就移除
  }
}
function drawFireballs() {
  for (let f of fireballs) drawSprite(SPR.to, floor(f.t / 4) % SPR.to.n, f.x, f.y + 3, f.dir);
}

// ---------- 10. 爆炸特效 ----------
function updateBooms() {
  for (let i = booms.length - 1; i >= 0; i--) {
    booms[i].t++;
    if (booms[i].t > 16) booms.splice(i, 1);
  }
}
function drawBooms() {
  for (let b of booms) drawSprite(SPR.boom, 0, b.x, b.y + 8, 1, 255 - b.t * 15, 1 + b.t * 0.08);
}

// ---------- 11. 小怪物（史萊姆、蘑菇怪） ----------
const TALK = {
  slime: ['咕嚕咕嚕！', '別走別走！', '我要撞你囉！'],
  mush: ['吼～', '蘑菇力量！', '站住！']
};
function spawnMonsters() {
  spawnTimer--;
  if (spawnTimer > 0 || monsters.length >= 5) return;
  spawnTimer = floor(random(90, 150));                // 隔一小段時間再生一隻
  const side = random() < 0.5 ? -1 : 1;               // 從左邊或右邊走進來
  const type = random() < 0.5 ? 'slime' : 'mush';
  monsters.push({
    type: type, x: side < 0 ? -14 : WW + 14, dy: floor(random(0, 7)),
    h: SPR[type + 'Walk'].h, dir: -side, state: 'walk', t: 0, speed: random(0.35, 0.6), say: '', sayT: 0
  });
}
function defeat(m) {            // 被擊倒：換成倒下的動畫
  m.state = 'fall'; m.t = 0; score++;
  if (score >= GOAL && gameState === 'play') {
    gameState = 'win';
    for (let o of monsters) if (o.state !== 'fall') { o.state = 'fall'; o.t = 0; }
  }
}
function updateMonsters() {
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    m.y = groundY + m.dy;
    m.t++;
    if (m.sayT > 0) m.sayT--;
    const dx = player.x - m.x;
    if (m.state !== 'fall') {
      m.dir = dx >= 0 ? 1 : -1;
      if (gameState === 'play') {
        m.x += m.dir * m.speed * (m.state === 'touch' ? 2 : 1);   // 生氣後衝得比較快
        if (m.state === 'walk' && abs(dx) < 46) {                 // 靠近洛奇亞：觸發生氣動畫與對話框
          m.state = 'touch'; m.t = 0;
          m.say = random(TALK[m.type]); m.sayT = 80;
        }
        // 撞到洛奇亞（跳起來跳過牠就不會被撞到）
        if (abs(dx) < 11 && player.y > m.y - m.h + 4 && inv === 0) {
          hp--; inv = 75; player.kx = -m.dir * 2.6;
          m.state = 'fall'; m.t = 0;                      // 撞到洛奇亞的小怪物也會倒下，但不算分數
          if (hp <= 0) gameState = 'lose';
        }
      }
    } else if (m.t >= 24) {
      monsters.splice(i, 1);                                      // 倒下動畫播完就消失
    }
  }
}
function monsterSprite(m) {
  const name = m.type + (m.state === 'walk' ? 'Walk' : m.state === 'touch' ? 'Touch' : 'Fall');
  const s = SPR[name];
  const speed = m.state === 'fall' ? 8 : 7;
  return [s, floor(m.t / speed) % s.n];
}
function drawMonsters() {
  const list = monsters.slice().sort((a, b) => a.dy - b.dy);   // 比較後面的先畫，才有前後的感覺
  for (let m of list) {
    noStroke(); fill(0, 0, 0, 45); ellipse(m.x, m.y + 1, 16, 3);
    const [s, f] = monsterSprite(m);
    drawSprite(s, f, m.x, m.y, m.dir);
  }
}

// ---------- 12. 畫面上的文字（生命、分數、對話框、提示） ----------
function drawHUD() {
  const u = max(14, S * 5);                         // 文字大小跟著畫面變
  textAlign(LEFT, CENTER);
  // 生命：愛心
  for (let i = 0; i < 3; i++) drawHeart(18 + i * (u * 1.5), 22, u * 0.55, i < hp);
  // 擊倒數
  textSize(u); noStroke(); fill(255); stroke(45, 36, 63); strokeWeight(4);
  textAlign(RIGHT, CENTER);
  text('擊倒：' + score + ' / ' + GOAL, width - 18, 22);
  // 底部操作提示
  textAlign(CENTER, CENTER); textSize(max(12, u * 0.75)); strokeWeight(3);
  text('← → 移動　Shift 跑步　↑ 跳　空白鍵 發功　R 重來', width / 2, height - 18);
  noStroke();
  // 開場對話框
  introT++;
  if (introOn && introT > 420) introOn = false;
  if (introOn && gameState === 'play') drawDialog('影子洛奇亞：\n草原上跑出好多小怪物！\n用空白鍵發功擊退牠們，擊倒 ' + GOAL + ' 隻就贏了！');
  // 怪物的對話氣泡
  for (let m of monsters) if (m.sayT > 0 && m.state !== 'fall') drawBubble(m);
  // 結束畫面
  if (gameState === 'lose') drawEnd('戰敗了…', '按 R 再挑戰一次');
  if (gameState === 'win') drawEnd('勝利！', '按 R 再玩一次');
}
function drawHeart(x, y, r, filled) {
  noStroke();
  fill(filled ? color(255, 90, 120) : color(255, 255, 255, 90));
  ellipse(x - r * 0.5, y - r * 0.2, r, r);
  ellipse(x + r * 0.5, y - r * 0.2, r, r);
  triangle(x - r * 0.98, y, x + r * 0.98, y, x, y + r * 1.15);
}
function drawDialog(msg) {
  const w = min(width - 40, 560), h = max(86, S * 26), x = (width - w) / 2, y = height - h - 52;
  stroke(45, 36, 63); strokeWeight(3); fill(255, 255, 255, 235);
  rect(x, y, w, h, 14);
  noStroke(); fill(45, 36, 63); textAlign(LEFT, CENTER); textSize(max(14, S * 4.4));
  text(msg, x + 18, y, w - 36, h);
}
function drawBubble(m) {
  const bx = m.x * S, by = (m.y - m.h - 6) * S, ts = max(12, S * 4);
  textSize(ts); textAlign(CENTER, CENTER);
  const w = textWidth(m.say) + 18, h = ts + 12;
  stroke(45, 36, 63); strokeWeight(2); fill(255);
  rect(bx - w / 2, by - h, w, h, 8);
  triangle(bx - 5, by, bx + 5, by, bx, by + 7);
  noStroke(); fill(45, 36, 63);
  text(m.say, bx, by - h / 2);
}
function drawEnd(title, sub) {
  noStroke(); fill(0, 0, 0, 110); rect(0, 0, width, height);
  fill(255); stroke(45, 36, 63); strokeWeight(6); textAlign(CENTER, CENTER);
  textSize(max(36, S * 14)); text(title, width / 2, height * 0.38);
  textSize(max(18, S * 6)); strokeWeight(4); text(sub, width / 2, height * 0.38 + max(48, S * 16));
  noStroke();
}

// R：重新開始
function restart() {
  hp = 3; score = 0; inv = 0; gameState = 'play';
  monsters = []; fireballs = []; booms = []; spawnTimer = 60;
  player.x = WW / 2; player.y = groundY; player.vy = 0; player.kx = 0; player.state = 'stop'; player.t = 0;
}

// ---------- 13. 鍵盤事件 ----------
function keyPressed() {
  introOn = false;                                  // 按任何鍵，開場對話框就消失
  if (keyCode === 82) restart();                    // R
  if (gameState !== 'play') return false;
  if (keyCode === UP_ARROW) startJump();           // ↑ 跳
  if (keyCode === 32) startPush();                  // 空白鍵 發功
  // 這幾個鍵按下去時，不要讓網頁跟著上下捲動
  if ([32, UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW].includes(keyCode)) return false;
}
