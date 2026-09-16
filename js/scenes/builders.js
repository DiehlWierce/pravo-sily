'use strict';
// Помощники для описания сцен: дома, комнаты, тропы, лесная чаща, покраска городских кварталов.
// Спавн — массив [вид, tx, ty, опции]. Виды перечислены в systems/spawn.js.

const SCENES = {};

// Комната: стены по периметру, выход — коврик в нижней стене
function room(name, w, h, layout, spawns, extra = {}) {
  return {
    name, theme: 'interior', w, h, ...extra,
    build(P) {
      P.rect(0, 0, w - 1, h - 1, '#'); P.rect(1, 2, w - 2, h - 2, '.');
      const ex = Math.floor(w / 2); P.set(ex, h - 1, 'E');
      layout(P);
      return [['exit', ex, h - 1], ...spawns];
    },
  };
}

// Дом из ASCII-карты: крыши и окна по компонентам, двери заперты, кроме перечисленных в doors
//   doors  — { 'x,y': 'сцена' } — двери, ведущие внутрь
//   colors — { 'x,y': цвет 0..3 } — цвет крыши дома, чей левый верхний угол в x,y
//   stalls — { 'x,y': цвет навеса 0..3 }
function paintTown(P, o = {}) {
  const seen = new Set(), spawns = [];
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    const c = P.get(x, y);
    if ((c === '#' || c === 'D') && !seen.has(x + ',' + y)) {
      // Компонент дома: заливка по соседям
      const cells = [], stack = [[x, y]]; seen.add(x + ',' + y);
      let minX = x, minY = y;
      while (stack.length) {
        const [cx, cy] = stack.pop(); cells.push([cx, cy]);
        minX = Math.min(minX, cx); minY = Math.min(minY, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
          if (!seen.has(k) && '#D'.includes(P.get(nx, ny)) && nx >= 0 && ny >= 0 && nx < P.w && ny < P.h) { seen.add(k); stack.push([nx, ny]); }
        }
      }
      const colors = o.colors || {}, key = minX + ',' + minY;
      const color = key in colors ? colors[key] : (minX * 7 + minY * 5) % 4;
      for (const [cx, cy] of cells) P.meta(cx, cy, color | ((cx * 3 + cy) % 4 === 1 ? 16 : 0));
    }
    if (c === 'D') {
      const to = (o.doors || {})[x + ',' + y];
      if (!to) P.meta(x, y, P.getMeta(x, y) | 256);
      spawns.push(['door', x, y, to ? { to } : { locked: true }]);
    }
    if (c === 'S') {
      const col = (o.stalls || {})[x + ',' + y];
      P.meta(x, y, (col !== undefined ? col : (x + y) % 4) << 9);
    }
  }
  return spawns;
}

// Тропа-змейка через лес: земля в середине, трава по краям. Клетки тропы не зарастают
function carvePath(P, path, protect, o = {}) {
  const { set, get } = P, half = o.half || 1;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(lerp(ax, bx, k / n)), y = Math.round(lerp(ay, by, k / n));
      for (let d = -half; d <= half; d++) {
        const mid = o.road ? Math.abs(d) <= 1 : d === 0;
        set(x, y + d, mid ? (o.road ? 'y' : ':') : (get(x, y + d) === 'T' ? '.' : get(x, y + d)));
        protect.add(`${x},${y + d}`);
      }
      if (o.wide) for (let d = -1; d <= 1; d++) protect.add(`${x + d},${y}`);
    }
  }
}

// Вокруг точек спавна лес не растёт
function protectSpawns(spawns, protect, r = 2) {
  for (const [, sx, sy] of spawns) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) protect.add(`${sx + dx},${sy + dy}`);
}

// Заполнить свободную траву деревьями, кустами, валунами. Поляны (glades) реже
function overgrow(P, protect, o = {}) {
  const { set, get, rng, w, h } = P;
  const sparse = (o.glades || []).map(([x, y, r]) => [x, y, r - 1]);
  const water = o.water || 0, trees = o.trees || 0.06, bushes = o.bushes || 0.08, rocks = o.rocks || 0.03;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (get(x, y) !== '.' || protect.has(`${x},${y}`)) continue;
    const k = sparse.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r) ? 0.3 : 1;
    const r = rng();
    if (water && r < water * k) set(x, y, '~');
    else if (r < (water + trees) * k) set(x, y, 'T');
    else if (r < (water + trees + bushes) * k) set(x, y, 'b');
    else if (r < (water + trees + bushes + rocks) * k) set(x, y, 'O');
    else if (o.logs && r < (water + trees + bushes + rocks + 0.015) * k && get(x + 1, y) === '.' && !protect.has(`${x + 1},${y}`)) { set(x, y, 'L'); set(x + 1, y, 'L'); }
    else if (r < 0.27) set(x, y, 'q');
    else if (r < 0.4) set(x, y, ',');
  }
}

// Дикая местность из полян и петляющей тропы: роща, болота
function wild(o) {
  return {
    name: o.name, theme: 'forest', w: o.w, h: o.h, fill: 'T', respawn: true,
    build(P) {
      for (const [x, y, r] of o.glades) P.circle(x, y, r, '.');
      const protect = new Set();
      carvePath(P, o.path, protect);
      protectSpawns(o.spawns, protect);
      overgrow(P, protect, { glades: o.glades, water: o.water, trees: 0.06, bushes: 0.09, rocks: 0.03 });
      return o.spawns.slice();
    },
  };
}
