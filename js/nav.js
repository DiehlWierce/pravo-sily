'use strict';
// Поиск пути для людей и зверей: A* по тайлам с обходом стен, заборов, воды, ящиков и бочек.
// Если до цели прямой проход свободен — идут напрямик, иначе по пути, срезая лишние повороты.
// Застрял — путь пересчитывается.

const Nav = {
  scene: null, rev: -1, builtAt: -1, w: 0, h: 0,
  block: null, g: null, from: null, seen: null, closed: null, stamp: 0,

  // Сетка проходимости: тайлы + стоящие предметы. Пересобирается при смене карты и раз в секунду
  ensure() {
    if (this.scene === World.name && this.rev === World.rev && Math.abs(Game.time - this.builtAt) < 1) return;
    const w = World.w, h = World.h, n = w * h;
    if (!this.block || this.block.length !== n) {
      this.block = new Uint8Array(n); this.g = new Float32Array(n); this.from = new Int32Array(n);
      this.seen = new Uint32Array(n); this.closed = new Uint32Array(n);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.block[y * w + x] = World.solidWalk(World.grid[y][x]) ? 1 : 0;
    for (const o of Game.objects) {
      if (o.state !== 'rest') continue;
      const x0 = Math.floor((o.x - o.hw + 1) / TS), x1 = Math.floor((o.x + o.hw - 1) / TS);
      const y0 = Math.floor((o.y - o.hh + 1) / TS), y1 = Math.floor((o.y + o.hh - 1) / TS);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < w && y < h) this.block[y * w + x] = 1;
    }
    Object.assign(this, { w, h, scene: World.name, rev: World.rev, builtAt: Game.time });
  },
  free(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && !this.block[ty * this.w + tx]; },
  nearestFree(tx, ty, r) {
    if (this.free(tx, ty)) return ty * this.w + tx;
    let best = -1, bd = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d = dx * dx + dy * dy;
      if (d < bd && this.free(tx + dx, ty + dy)) { bd = d; best = (ty + dy) * this.w + tx + dx; }
    }
    return best;
  },

  // Прямой проход для тела шириной hw×hh: сэмплы вдоль отрезка по сетке проходимости
  clear(e, bx, by) {
    const d = dist(e.x, e.y, bx, by);
    if (d > 480) return false;
    const n = Math.ceil(d / 4), hw = e.hw + 1, hh = e.hh + 1;
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = lerp(e.x, bx, t), y = lerp(e.y, by, t);
      const x0 = Math.floor((x - hw) / TS), x1 = Math.floor((x + hw - 0.01) / TS);
      const y0 = Math.floor((y - hh) / TS), y1 = Math.floor((y + hh - 0.01) / TS);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (!this.free(tx, ty)) return false;
    }
    return true;
  },

  // A*: восемь направлений, без срезания углов. Недостижимая цель — путь к ближайшей достижимой клетке
  find(ax, ay, bx, by) {
    this.ensure();
    const w = this.w;
    const s = this.nearestFree(Math.floor(ax / TS), Math.floor(ay / TS), 2);
    const t = this.nearestFree(Math.floor(bx / TS), Math.floor(by / TS), 3);
    if (s < 0 || t < 0) return null;
    const stamp = ++this.stamp, g = this.g, from = this.from, seen = this.seen, closed = this.closed;
    const tx = t % w, ty = (t / w) | 0;
    const heur = i => { const dx = Math.abs(i % w - tx), dy = Math.abs(((i / w) | 0) - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const hf = [], hi = [];   // двоичная куча
    const push = (f, i) => {
      let k = hf.length; hf.push(f); hi.push(i);
      while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= f) break; hf[k] = hf[p]; hi[k] = hi[p]; k = p; }
      hf[k] = f; hi[k] = i;
    };
    const pop = () => {
      const top = hi[0], lf = hf.pop(), li = hi.pop(), n = hf.length;
      if (n) {
        let k = 0;
        for (;;) {
          let c = 2 * k + 1; if (c >= n) break;
          if (c + 1 < n && hf[c + 1] < hf[c]) c++;
          if (hf[c] >= lf) break;
          hf[k] = hf[c]; hi[k] = hi[c]; k = c;
        }
        hf[k] = lf; hi[k] = li;
      }
      return top;
    };
    g[s] = 0; seen[s] = stamp; from[s] = -1; push(heur(s), s);
    let best = s, bestH = heur(s), found = false, budget = 5000;
    while (hf.length && budget-- > 0) {
      const cur = pop();
      if (closed[cur] === stamp) continue;
      closed[cur] = stamp;
      if (cur === t) { found = true; break; }
      const hc = heur(cur); if (hc < bestH) { bestH = hc; best = cur; }
      const cx = cur % w, cy = (cur / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!this.free(nx, ny)) continue;
        if (dx && dy && (!this.free(cx + dx, cy) || !this.free(cx, cy + dy))) continue;
        const ni = ny * w + nx;
        if (closed[ni] === stamp) continue;
        const ng = g[cur] + (dx && dy ? 1.414 : 1);
        if (seen[ni] !== stamp || ng < g[ni]) { seen[ni] = stamp; g[ni] = ng; from[ni] = cur; push(ng + heur(ni), ni); }
      }
    }
    const end = found ? t : best, path = [];
    for (let i = end; i !== s && i >= 0; i = from[i]) path.push({ x: (i % w) * TS + 8, y: ((i / w) | 0) * TS + 9 });
    path.reverse();
    if (found && this.free(Math.floor(bx / TS), Math.floor(by / TS))) path.push({ x: bx, y: by });
    path.partial = !found;
    return path;
  },

  // Шаг к цели. Возвращает true, когда пришёл (или подошёл так близко, как пускает карта)
  go(e, gx, gy, speed, dt) {
    if (dist(e.x, e.y, gx, gy) < 3) return true;
    this.ensure();
    const n = e.nav || (e.nav = { path: null, i: 0, t: 0, gx, gy, cx: e.x, cy: e.y, st: 0, stuck: false });
    n.t -= dt;
    if (!n.stuck && this.clear(e, gx, gy)) { n.path = null; return stepTo(e, gx, gy, speed, dt); }
    const exhausted = n.path && n.i >= n.path.length;
    if (exhausted && n.path.partial && dist(n.gx, n.gy, gx, gy) < TS) return true;
    if (!n.path || n.stuck || (exhausted && n.t <= 0) || (n.t <= 0 && dist(n.gx, n.gy, gx, gy) > TS)) {
      n.path = this.find(e.x, e.y, gx, gy); n.i = 0; n.t = rrange(0.3, 0.5); n.gx = gx; n.gy = gy; n.stuck = false;
      if (!n.path) return stepTo(e, gx, gy, speed, dt);
    }
    if (n.i >= n.path.length) return stepTo(e, gx, gy, speed, dt);
    for (let k = 0; k < 4 && n.i < n.path.length - 1 && this.clear(e, n.path[n.i + 1].x, n.path[n.i + 1].y); k++) n.i++;
    const wp = n.path[n.i];
    if (stepTo(e, wp.x, wp.y, speed, dt)) n.i++;
    n.st += dt;
    if (n.st > 0.6) {   // за полсекунды почти не сдвинулся — упёрся, ищем путь заново
      if (dist(e.x, e.y, n.cx, n.cy) < speed * 0.12) { n.stuck = true; n.path = null; }
      n.st = 0; n.cx = e.x; n.cy = e.y;
    }
    return false;
  },
};
