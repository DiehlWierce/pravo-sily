'use strict';
// Движение тел, столкновения, конусы обзора. Тело — любой объект с x, y (ступни), hw, hh (полуразмеры).

function overlaps(o, x, y, hw, hh) { return Math.abs(o.x - x) < o.hw + hw && Math.abs(o.y - y) < o.hh + hh; }

// Занято ли место: тайлы + стоящие предметы (ящики, бочки, камни)
function blockedAt(e, x, y) {
  if (World.boxHits(x, y, e.hw, e.hh, false)) return true;
  for (const o of Game.objects) {
    if (o === e || o.state !== 'rest') continue;
    if (overlaps(o, x, y, e.hw, e.hh) && !overlaps(o, e.x, e.y, e.hw, e.hh)) return true;
  }
  return false;
}

// Сдвинуть тело по осям раздельно — так оно скользит вдоль стен. Возвращает true, если во что-то упёрлось
function moveBody(e, dx, dy) {
  let hit = false;
  if (dx) { if (!blockedAt(e, e.x + dx, e.y)) e.x += dx; else hit = true; }
  if (dy) { if (!blockedAt(e, e.x, e.y + dy)) e.y += dy; else hit = true; }
  return hit;
}

// Шаг напрямик к точке. Возвращает true, когда пришёл. Для обхода препятствий — Nav.go
function stepTo(e, gx, gy, speed, dt) {
  const d = dist(e.x, e.y, gx, gy);
  if (d < 3) return true;
  const n = norm(gx - e.x, gy - e.y), s = Math.min(speed * dt, d);
  // Упёрся совсем — пробуем боком. Если хоть по одной оси продвинулся, не мешаем, иначе тело дёргается туда-обратно
  const shift = (dx, dy) => { const ox = e.x, oy = e.y; moveBody(e, dx, dy); return Math.abs(e.x - ox) + Math.abs(e.y - oy); };
  if (shift(n.x * s, n.y * s) < s * 0.25 && shift(-n.y * s, n.x * s) < s * 0.25) shift(n.y * s, -n.x * s);
  e.moving = true; if (Math.abs(n.x) > 0.2) e.lr = n.x > 0 ? 'r' : 'l';
  e.angle = Math.atan2(n.y, n.x);
  return false;
}

// Толчок: скорость отбрасывания затухает в updateKnockback
function knock(e, vx, vy) { e.kvx = vx; e.kvy = vy; }
function updateKnockback(e, dt, damping = 0.002) {
  if (!e.kvx && !e.kvy) return;
  moveBody(e, e.kvx * dt, e.kvy * dt);
  e.kvx *= Math.pow(damping, dt); e.kvy *= Math.pow(damping, dt);
  if (Math.abs(e.kvx) + Math.abs(e.kvy) < 5) e.kvx = e.kvy = 0;
}

// Видит ли src цель t в конусе angle ± half на дистанции range (с учётом стен)
function inCone(src, angle, half, range, t) {
  const d = dist(src.x, src.y, t.x, t.y);
  if (d > range) return false;
  return angleDiff(Math.atan2(t.y - src.y, t.x - src.x), angle) <= half && World.sight(src.x, src.y - 6, t.x, t.y - 6);
}
function drawCone(ctx, cam, src, angle, half, range, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(Math.round(src.x - cam.x), Math.round(src.y - 6 - cam.y));
  ctx.arc(Math.round(src.x - cam.x), Math.round(src.y - 6 - cam.y), range, angle - half, angle + half);
  ctx.closePath(); ctx.fill();
}
