
const W = 420, H = 640;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreHud = document.getElementById("scoreHud");
const livesHud = document.getElementById("livesHud");
const hiHud = document.getElementById("hiHud");

const keys = {};
const stick = { dx: 0, dy: 0, firing: false };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const HI_KEY = "aether-raid-hi";

let state = "title";
let t = 0, wave = 1, score = 0, combo = 1, comboT = 0, lives = 3;
let hi = Number(localStorage.getItem(HI_KEY) || 0);
let shake = 0, flash = 0, fireCd = 0, invuln = 0, spawnT = 0, boss = null;
let player, bullets, ebullets, enemies, particles, powerups, stars;

function resetRun() {
  score = 0; combo = 1; comboT = 0; lives = 3; wave = 1; t = 0;
  shake = 0; flash = 0; fireCd = 0; invuln = 1.2; spawnT = 0; boss = null;
  player = { x: W/2, y: H - 80, w: 16, h: 18, speed: 280, spread: 0, shield: 0, rapid: 0 };
  bullets = []; ebullets = []; enemies = []; particles = []; powerups = [];
  stars = Array.from({length: 70}, () => ({
    x: rand(0, W), y: rand(0, H), z: rand(0.3, 1.6), tw: rand(0, 6)
  }));
  hud();
}

function hud() {
  scoreHud.textContent = "SCORE " + score;
  livesHud.textContent = "▲".repeat(Math.max(0, lives)) || "—";
  hiHud.textContent = "HI " + hi;
}

function burst(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(20, spd || 180);
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: rand(0.25, 0.7), max: 0.7, color, r: rand(1, 3) });
  }
}

function addScore(n) {
  comboT = 1.6;
  score += Math.floor(n * combo);
  combo = Math.min(8, combo + 0.25);
  if (score > hi) { hi = score; localStorage.setItem(HI_KEY, String(hi)); }
  hud();
}

function spawnWave() {
  const kindCycle = ["scout", "weaver", "tank"];
  const count = 5 + wave * 2;
  for (let i = 0; i < count; i++) {
    const kind = kindCycle[i % (wave >= 3 ? 3 : 2)];
    const col = i % 5;
    const row = Math.floor(i / 5);
    enemies.push({
      kind, hp: kind === "tank" ? 6 : kind === "weaver" ? 3 : 2,
      x: 50 + col * 80, y: -40 - row * 42,
      ox: 50 + col * 80, phase: rand(0, 6),
      fire: rand(0.4, 1.2), t: 0
    });
  }
  if (wave % 4 === 0) {
    boss = { x: W/2, y: -80, hp: 40 + wave * 8, max: 40 + wave * 8, t: 0, fire: 0 };
  }
}

function playerFire() {
  const rate = player.rapid > 0 ? 0.08 : 0.16;
  if (fireCd > 0) return;
  fireCd = rate;
  AudioSys.shoot();
  const mk = (dx) => bullets.push({ x: player.x + dx, y: player.y - 12, vx: dx * 2, vy: -520, r: 3 });
  mk(0);
  if (player.spread > 0) { mk(-10); mk(10); }
}

function hitPlayer() {
  if (invuln > 0) return;
  if (player.shield > 0) {
    player.shield = 0; invuln = 0.6; flash = 0.2; AudioSys.hit();
    burst(player.x, player.y, "#5ef2ff", 12, 140);
    return;
  }
  lives--; hud(); shake = 10; invuln = 1.5; AudioSys.death();
  burst(player.x, player.y, "#ff4fd8", 28, 240);
  if (lives <= 0) { state = "dead"; AudioSys.ui(); }
}

function update(dt) {
  t += dt;
  AudioSys.tick(dt);
  comboT -= dt; if (comboT <= 0) combo = 1;
  fireCd -= dt; invuln -= dt; shake = Math.max(0, shake - dt * 18); flash = Math.max(0, flash - dt);
  player.spread = Math.max(0, player.spread - dt);
  player.shield = Math.max(0, player.shield - dt);
  player.rapid = Math.max(0, player.rapid - dt);

  stars.forEach(s => { s.y += (40 + s.z * 90) * dt; if (s.y > H) { s.y = 0; s.x = rand(0, W); } });

  if (state !== "play") return;

  let dx = stick.dx, dy = stick.dy;
  if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
  if (keys.ArrowRight || keys.d || keys.D) dx += 1;
  if (keys.ArrowUp || keys.w || keys.W) dy -= 1;
  if (keys.ArrowDown || keys.s || keys.S) dy += 1;
  const n = Math.hypot(dx, dy) || 1;
  player.x = clamp(player.x + (dx/n) * player.speed * dt, 18, W-18);
  player.y = clamp(player.y + (dy/n) * player.speed * dt, 40, H-24);
  if (stick.firing || keys[" "] || keys.z || keys.Z || keys.k || keys.K) playerFire();

  spawnT -= dt;
  if (spawnT <= 0 && enemies.length === 0 && !boss) {
    spawnWave(); wave++; spawnT = 1.2;
  }

  enemies.forEach(e => {
    e.t += dt; e.fire -= dt;
    if (e.kind === "scout") { e.y += 70 * dt; e.x = e.ox + Math.sin(t * 2 + e.phase) * 18; }
    if (e.kind === "weaver") { e.y += 55 * dt; e.x = e.ox + Math.sin(t * 3 + e.phase) * 70; }
    if (e.kind === "tank") { e.y += 36 * dt; e.x = e.ox + Math.sin(t + e.phase) * 10; }
    if (e.fire <= 0 && e.y > 10 && e.y < H - 80) {
      e.fire = e.kind === "tank" ? 1.1 : e.kind === "weaver" ? 1.4 : 1.8;
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      const spd = e.kind === "tank" ? 160 : 210;
      ebullets.push({ x: e.x, y: e.y + 8, vx: Math.cos(a)*spd*0.15, vy: spd });
      if (e.kind === "tank") {
        ebullets.push({ x: e.x, y: e.y + 8, vx: -80, vy: 180 });
        ebullets.push({ x: e.x, y: e.y + 8, vx: 80, vy: 180 });
      }
    }
  });

  if (boss) {
    boss.t += dt; boss.fire -= dt;
    boss.y += (boss.y < 110 ? 50 : 0) * dt;
    boss.x = W/2 + Math.sin(boss.t * 0.8) * 120;
    if (boss.fire <= 0) {
      boss.fire = 0.28;
      for (let i = -2; i <= 2; i++) {
        ebullets.push({ x: boss.x + i * 16, y: boss.y + 24, vx: i * 40, vy: 220 });
      }
    }
  }

  bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
  ebullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= 0.98; p.vy *= 0.98; });
  powerups.forEach(p => { p.y += 70 * dt; p.spin += dt * 4; });

  for (const b of bullets) {
    for (const e of enemies) {
      if (Math.hypot(b.x - e.x, b.y - e.y) < 16) {
        e.hp--; b.y = -999; burst(e.x, e.y, "#ffd166", 6, 90);
        if (e.hp <= 0) {
          addScore(e.kind === "tank" ? 250 : 100);
          AudioSys.explode(); shake = 4;
          burst(e.x, e.y, e.kind === "tank" ? "#ff4fd8" : "#5ef2ff", 18, 200);
          if (Math.random() < 0.18) {
            const kinds = ["spread", "shield", "rapid"];
            powerups.push({ x: e.x, y: e.y, kind: kinds[Math.floor(rand(0,3))], spin: 0 });
          }
          e.y = 9999;
        }
      }
    }
    if (boss && Math.hypot(b.x - boss.x, b.y - boss.y) < 36) {
      boss.hp--; b.y = -999; addScore(20); burst(b.x, b.y, "#ff4fd8", 8, 120);
      if (boss.hp <= 0) {
        addScore(2000); AudioSys.explode(); shake = 14; flash = 0.4;
        burst(boss.x, boss.y, "#ffd166", 50, 280);
        powerups.push({ x: boss.x, y: boss.y, kind: "spread", spin: 0 });
        boss = null;
      }
    }
  }

  for (const b of ebullets) {
    const rad = player.shield > 0 ? 22 : 12;
    if (Math.hypot(b.x - player.x, b.y - player.y) < rad) { b.y = 9999; hitPlayer(); }
  }
  for (const e of enemies) {
    if (Math.hypot(e.x - player.x, e.y - player.y) < 18) hitPlayer();
  }
  for (const p of powerups) {
    if (Math.hypot(p.x - player.x, p.y - player.y) < 20) {
      AudioSys.pickup(); addScore(50);
      if (p.kind === "spread") player.spread = 8;
      if (p.kind === "shield") player.shield = 8;
      if (p.kind === "rapid") player.rapid = 8;
      p.y = 9999;
    }
  }

  bullets = bullets.filter(b => b.y > -20 && b.y < H + 20);
  ebullets = ebullets.filter(b => b.y < H + 30 && b.y > -20);
  enemies = enemies.filter(e => e.y < H + 40 && e.hp > 0);
  particles = particles.filter(p => p.life > 0);
  powerups = powerups.filter(p => p.y < H + 20);
}

function drawShip(x, y, color, scale, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.rotate(Math.PI);
  ctx.scale(scale, scale);
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(9, 10); ctx.lineTo(0, 5); ctx.lineTo(-9, 10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(0, -1, 2.2, 0, 7); ctx.fill();
  ctx.restore();
}

function draw() {
  const sx = (Math.random()-0.5) * shake;
  const sy = (Math.random()-0.5) * shake;
  ctx.setTransform(1,0,0,1,sx,sy);
  ctx.fillStyle = "#070914";
  ctx.fillRect(-10, -10, W+20, H+20);

  stars.forEach(s => {
    ctx.globalAlpha = 0.35 + s.z * 0.4;
    ctx.fillStyle = "#cfefff";
    ctx.fillRect(s.x, s.y, s.z, s.z * 2.2);
  });
  ctx.globalAlpha = 1;

  if (state === "title" || state === "pause" || state === "dead") {
    enemies.forEach(e => drawShip(e.x, e.y, e.kind === "tank" ? "#ff4fd8" : "#7aa2ff", 0.9, true));
  }

  if (state === "play" || state === "pause") {
    bullets.forEach(b => {
      ctx.fillStyle = "#5ef2ff"; ctx.shadowColor = "#5ef2ff"; ctx.shadowBlur = 8;
      ctx.fillRect(b.x-1.5, b.y-6, 3, 10);
    });
    ctx.shadowBlur = 0;
    ebullets.forEach(b => {
      ctx.fillStyle = "#ff4fd8";
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill();
    });
    enemies.forEach(e => {
      const c = e.kind === "tank" ? "#ff4fd8" : e.kind === "weaver" ? "#ffd166" : "#7aa2ff";
      drawShip(e.x, e.y, c, e.kind === "tank" ? 1.15 : 0.85, true);
    });
    if (boss) {
      drawShip(boss.x, boss.y, "#ff4fd8", 2.4, true);
      ctx.fillStyle = "#1a1020";
      ctx.fillRect(boss.x - 40, boss.y - 42, 80, 6);
      ctx.fillStyle = "#5ef2ff";
      ctx.fillRect(boss.x - 40, boss.y - 42, 80 * (boss.hp / boss.max), 6);
    }
    powerups.forEach(p => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
      ctx.strokeStyle = p.kind === "shield" ? "#5ef2ff" : p.kind === "rapid" ? "#ffd166" : "#ff4fd8";
      ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    });
    particles.forEach(p => {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.r, p.r);
    });
    ctx.globalAlpha = 1;
    if (player.shield > 0) {
      ctx.strokeStyle = "rgba(94,242,255,0.7)";
      ctx.beginPath(); ctx.arc(player.x, player.y, 22, 0, 7); ctx.stroke();
    }
    if (invuln <= 0 || Math.floor(t * 16) % 2 === 0) {
      drawShip(player.x, player.y, "#5ef2ff", 1, false);
      ctx.fillStyle = "#ffd166";
      ctx.globalAlpha = 0.7;
      ctx.fillRect(player.x - 2, player.y + 10, 4, 8 + Math.sin(t*30)*2);
      ctx.globalAlpha = 1;
    }
  }

  // CRT scanlines
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,230,255,${flash * 0.35})`;
    ctx.fillRect(0,0,W,H);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#e8f6ff";
  ctx.shadowColor = "#5ef2ff"; ctx.shadowBlur = 12;
  if (state === "title") {
    ctx.font = "bold 34px Trebuchet MS";
    ctx.fillText("AETHER RAID", W/2, H/2 - 50);
    ctx.shadowBlur = 0;
    ctx.font = "14px Trebuchet MS";
    ctx.fillStyle = "#ff4fd8";
    ctx.fillText("NEON CABINET SHOOTER", W/2, H/2 - 22);
    ctx.fillStyle = "#cfefff";
    ctx.fillText("tap, click or enter to start", W/2, H/2 + 24);
    ctx.font = "12px Trebuchet MS";
    ctx.fillText("clear waves · grab diamonds · don't blink", W/2, H/2 + 48);
  }
  if (state === "pause") {
    ctx.font = "bold 28px Trebuchet MS";
    ctx.fillText("PAUSED", W/2, H/2);
  }
  if (state === "dead") {
    ctx.font = "bold 28px Trebuchet MS";
    ctx.fillText("GAME OVER", W/2, H/2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = "14px Trebuchet MS";
    ctx.fillText("score " + score + "   hi " + hi, W/2, H/2 + 10);
    ctx.fillText("tap to raid again", W/2, H/2 + 36);
  }
  ctx.shadowBlur = 0;
  if (state === "play" && combo > 1.2) {
    ctx.textAlign = "left";
    ctx.font = "12px Trebuchet MS";
    ctx.fillStyle = "#ffd166";
    ctx.fillText("x" + combo.toFixed(1), 12, 36);
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  AudioSys.unlock();
  AudioSys.ui();
  resetRun();
  state = "play";
  spawnT = 0.4;
}

window.AetherRaid = {
  start() {
    resetRun();
    hiHud.textContent = "HI " + hi;
    requestAnimationFrame(loop);
  },
  onKey(e) {
    keys[e.key] = e.type === "keydown";
    if (e.type !== "keydown") return;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    if (e.key === "m" || e.key === "M") {
      AudioSys.setMute(!AudioSys.isMute());
      AudioSys.ui();
    }
    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      if (state === "play") state = "pause";
      else if (state === "pause") state = "play";
    }
    if (e.key === "Enter") {
      if (state === "title" || state === "dead") startGame();
    }
  },
  onClick() {
    if (state === "title" || state === "dead") startGame();
  },
  setStick(dx, dy) { stick.dx = dx; stick.dy = dy; },
  setFiring(v) { stick.firing = !!v; },
  toggleMute() { AudioSys.setMute(!AudioSys.isMute()); AudioSys.ui(); },
  togglePause() {
    if (state === "play") state = "pause";
    else if (state === "pause") state = "play";
  }
};
