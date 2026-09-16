'use strict';
// Мир прототипа: Чёрный лес → поляна шипогрыза → арена Кейла → река с воротами → зона проверки телекинеза.
// Карта собирается кодом из прямоугольников и кругов — так её легко править.

const MAP_W = 72, MAP_H = 36;

const World = (() => {
  const g = [];
  const R = mulberry32(42);
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill('.'));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const circle = (cx, cy, r, c) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r) set(x, y, c); };

  // Густой лес повсюду, потом вырезаем проходимые области
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) g[y][x] = 'T';

  // Зона 1: опушка, куда герой прибежал
  circle(6, 20, 5, '.'); rect(3, 17, 12, 24, '.');
  // Тропа к поляне шипогрыза
  rect(10, 18, 14, 20, '.'); rect(12, 12, 15, 19, '.');
  // Поляна шипогрыза
  circle(18, 11, 6, '.');
  // Проход к арене
  rect(23, 10, 29, 13, '.');
  // Арена Кейла
  circle(36, 18, 9, '.'); rect(28, 11, 44, 25, '.');
  // Проход к реке
  rect(44, 17, 49, 19, '.');
  // Река с островком и мостом
  rect(48, 6, 56, 30, '.');
  rect(51, 3, 53, 33, '~');
  set(52, 11, 'o');                         // плита на островке
  rect(51, 18, 53, 18, '=');                // мост
  rect(54, 3, 54, 33, 'T'); set(54, 18, 'G'); // стена деревьев и ворота
  // Зона 4: проверка телекинеза
  rect(55, 10, 69, 30, '.'); circle(62, 20, 7, '.');

  // Декор: дорожки и цветы, одиночные деревья
  for (let x = 3; x < 50; x++) { const y = x < 12 ? 20 : x < 24 ? 12 : 18; if (g[y][x] === '.') set(x, y, ':'); }
  for (let y = 12; y < 20; y++) if (g[y][13] === '.') set(13, y, ':');
  for (let x = 55; x < 70; x++) if (g[18][x] === '.') set(x, 18, ':');
  for (let i = 0; i < 90; i++) {
    const x = (R() * MAP_W) | 0, y = (R() * MAP_H) | 0;
    if (g[y][x] === '.') set(x, y, R() < 0.35 ? ',' : '.');
  }
  // Препятствия, об которые шипогрыз может разбиться
  set(16, 8, 'T'); set(21, 14, 'T'); set(22, 9, 'T');
  // Укрытия на арене и в зоне 4
  set(33, 14, 'T'); set(40, 22, 'T'); set(57, 14, 'T'); set(66, 24, 'T');
  // Каменные стены по краям арены
  rect(30, 26, 42, 26, '#'); rect(34, 10, 38, 10, '#');

  const spawns = [
    ['player', 5, 20],
    ['herb', 4, 18], ['berries', 9, 23], ['herb', 25, 11], ['berries', 46, 17], ['herb', 49, 25],
    ['spiker', 18, 11],
    ['rock', 15, 13], ['rock', 20, 8], ['boulder', 19, 15],
    ['boss', 38, 18],
    ['rock', 32, 16], ['rock', 35, 21], ['rock', 39, 14], ['rock', 41, 19], ['rock', 30, 20], ['rock', 37, 24],
    ['crate', 31, 23], ['boulder', 42, 13],
    ['crate', 49, 11], ['rock', 48, 22],
    ['jumper', 59, 12], ['jumper', 64, 26], ['spiker', 57, 26],
    ['thrower', 67, 16], ['rock', 63, 15], ['rock', 58, 20], ['crate', 61, 22], ['boulder', 65, 19],
    ['herb', 57, 29], ['berries', 68, 28],
    ['campfire', 68, 22],
  ];

  let gateOpen = false;
  const at = (tx, ty) => (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) ? 'T' : g[ty][tx];
  const atPx = (x, y) => at(Math.floor(x / TS), Math.floor(y / TS));
  const solidWalk = c => c === 'T' || c === '#' || c === '~' || (c === 'G' && !gateOpen);
  const solidFly = c => c === 'T' || c === '#' || (c === 'G' && !gateOpen);

  function boxHits(x, y, hw, hh, fly) {
    const test = fly ? solidFly : solidWalk;
    const x0 = Math.floor((x - hw) / TS), x1 = Math.floor((x + hw - 0.01) / TS);
    const y0 = Math.floor((y - hh) / TS), y1 = Math.floor((y + hh - 0.01) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (test(at(tx, ty))) return true;
    return false;
  }

  // Прямая видимость: деревья, скалы и закрытые ворота её перекрывают, вода — нет
  function los(ax, ay, bx, by) {
    const d = dist(ax, ay, bx, by), n = Math.ceil(d / 4);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (solidFly(atPx(lerp(ax, bx, t), lerp(ay, by, t)))) return false;
    }
    return true;
  }

  function draw(ctx, cam, time) {
    const tx0 = Math.floor(cam.x / TS), ty0 = Math.floor(cam.y / TS);
    const T = Art.tiles, wf = Math.floor(time * 2) % 2;
    for (let ty = ty0; ty <= ty0 + Math.ceil(H / TS); ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(W / TS); tx++) {
      const c = at(tx, ty), h = (tx * 73856093 ^ ty * 19349663) >>> 0;
      const sx = tx * TS - Math.round(cam.x), sy = ty * TS - Math.round(cam.y);
      let img;
      switch (c) {
        case 'T': img = T.tree[h % 2]; break;
        case '#': img = T.wall; break;
        case '~': img = T.water[(wf + h) % 2]; break;
        case '=': img = T.bridge; break;
        case ':': img = T.dirt[h % 2]; break;
        case ',': img = T.flowers; break;
        case 'G': img = gateOpen ? T.dirt[0] : T.gate; break;
        case 'o': img = World.plateLit ? T.plateLit : T.plate; break;
        default: img = T.grass[h % 3];
      }
      ctx.drawImage(img, sx, sy);
    }
  }

  return {
    spawns, at, atPx, solidWalk, solidFly, boxHits, los, draw, plateLit: false,
    get gateOpen() { return gateOpen; }, set gateOpen(v) { gateOpen = v; },
    pxW: MAP_W * TS, pxH: MAP_H * TS,
  };
})();
