'use strict';
// Тайловый мир текущей сцены: сетка символов, коллизии, линия обзора, отрисовка.
// Сцена задаётся либо ASCII-картой (def.map — массив строк), либо генератором def.build(P).
//
// Легенда тайлов:
//  .  земля / пол            ,  декор земли          :  брусчатка / тропа     y  колея дороги
//  T  дерево (в городе — городская стена)            #  дом / скала / стена   D  дверь
//  ~  вода / канава          =  мостки               f  забор                 X  городская стена
//  S  прилавок               M  стол богатого торговца                        b  кусты (обзор не закрывают)
//  O  валун                  L  поваленный ствол     q  камешки (декор)       J  завал из брёвен
//  Y  крыша хижины           Z  стена хижины         R / W / h  руины: крыша, стена, пролом
//  G  трава в городе         P  дерево в кадке       w  колодец
//  Интерьер: B/V кровать, t стол, k печь, H полка, C сундук, r ковёр, E выход, c стойка, d доска, Q каменный пол

const TILE_SOLID = 'T#D~fSMXOLYZRWBVtkHCcdJPw';   // сквозь это не пройти
const TILE_FLY = 'T#DSMXOLYZRWBVtkHCcdJPw';       // сквозь это не пролетит камень (вода и заборы — пролетит)
const TILE_SIGHT = 'T#DXOYZRWHdJP';               // закрывает обзор (прилавки и столы низкие — не закрывают)

const World = {
  name: '', theme: 'forest', w: 0, h: 0, grid: [], meta: [], tint: null, rev: 0, def: null, spawns: [],

  load(def) {
    this.rev++;
    Object.assign(this, { def, name: def.name, theme: def.theme, tint: def.tint || null, barriers: {} });
    if (def.map) {
      this.h = def.map.length; this.w = Math.max(...def.map.map(r => r.length));
      this.grid = def.map.map(r => [...r.padEnd(this.w, def.fill || '.')]);
    } else {
      this.w = def.w; this.h = def.h;
      this.grid = [];
      for (let y = 0; y < def.h; y++) this.grid.push(new Array(def.w).fill(def.fill || '.'));
    }
    this.meta = new Array(this.w * this.h).fill(0);
    const built = def.build ? def.build(this.painter()) || [] : [];
    this.spawns = [...(def.spawns || []), ...built];
    this.spawns.forEach(s => { s.id = s.id || `${def.name}:${s[0]}:${s[1]},${s[2]}`; });
  },

  // Кисть для генераторов карт
  painter() {
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.grid[y][x] = c; };
    return {
      w: this.w, h: this.h, set,
      rect: (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); },
      circle: (cx, cy, r, c) => {
        for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r) set(x, y, c);
      },
      get: (x, y) => this.at(x, y),
      meta: (x, y, v) => { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.meta[y * this.w + x] = v; },
      getMeta: (x, y) => this.meta[y * this.w + x] || 0,
      rng: mulberry32([...(this.name)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0),
    };
  },

  get pxW() { return this.w * TS; },
  get pxH() { return this.h * TS; },
  at(tx, ty) { return (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) ? 'T' : this.grid[ty][tx]; },
  atPx(x, y) { return this.at(Math.floor(x / TS), Math.floor(y / TS)); },
  // Завал поперёк всей карты: closed — перекрыть столбец x, иначе вернуть прежние тайлы.
  // Кто стоял в столбце — сдвигается на восточную сторону
  barrier(x, closed, fill = 'J') {
    const b = this.barriers;
    if (closed) {
      if (b[x]) return;
      b[x] = [];
      for (let y = 0; y < this.h; y++) { const c = this.at(x, y); if (!this.solidWalk(c)) { b[x].push([y, c]); this.set(x, y, fill); } }
      for (const e of [Game.player, ...Game.enemies, ...Game.npcs]) {
        if (e && this.boxHits(e.x, e.y, e.hw || 4, e.hh || 3, false) && Math.floor(e.x / TS) >= x - 1 && Math.floor(e.x / TS) <= x + 1) e.x = (x + 1) * TS + (e.hw || 4) + 1;
      }
    } else if (b[x]) {
      for (const [y, c] of b[x]) this.set(x, y, c);
      delete b[x];
    }
  },
  set(tx, ty, c) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h || this.grid[ty][tx] === c) return;
    this.grid[ty][tx] = c; this.rev++;
  },

  solidWalk(c) { return TILE_SOLID.includes(c); },
  solidFly(c) { return TILE_FLY.includes(c); },
  blocksSight(c) { return TILE_SIGHT.includes(c); },

  boxHits(x, y, hw, hh, fly) {
    const x0 = Math.floor((x - hw) / TS), x1 = Math.floor((x + hw - 0.01) / TS);
    const y0 = Math.floor((y - hh) / TS), y1 = Math.floor((y + hh - 0.01) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = this.at(tx, ty);
      if (fly ? this.solidFly(c) : this.solidWalk(c)) return true;
    }
    return false;
  },
  los(ax, ay, bx, by) { return this.ray(ax, ay, bx, by, c => this.solidFly(c)); },
  sight(ax, ay, bx, by) { return this.ray(ax, ay, bx, by, c => this.blocksSight(c)); },
  ray(ax, ay, bx, by, blocks) {
    const d = dist(ax, ay, bx, by), n = Math.ceil(d / 4);
    for (let i = 1; i < n; i++) { const t = i / n; if (blocks(this.atPx(lerp(ax, bx, t), lerp(ay, by, t)))) return false; }
    return true;
  },

  tileImg(c, tx, ty, time) {
    const T = Art.tiles, h = (tx * 73856093 ^ ty * 19349663) >>> 0, wf = Math.floor(time * 2 + h) % 2;
    const inside = tx >= 0 && ty >= 0 && tx < this.w && ty < this.h;
    const m = inside ? this.meta[ty * this.w + tx] : 0;
    if (this.theme === 'interior') {
      switch (c) {
        case 'T': return T.void;
        case '#': return '#TE'.includes(this.at(tx, ty + 1)) || !inside ? T.wallTopI : T.wallFrontI;
        case 'B': return T.bedTop; case 'V': return T.bedFoot;
        case 't': return T.table; case 'k': return T.stove; case 'H': return T.shelf; case 'C': return T.chest;
        case 'r': return T.rug; case 'E': return T.exitMat;
        case 'c': return T.counter; case 'd': return T.boardTile; case 'Q': return T.stoneFloor[h % 2];
        default: return T.floor[h % 2];
      }
    }
    if (this.theme === 'slums') {
      switch (c) {
        case 'T': case 'X': return T.townWall;
        case '#': return '#D'.includes(this.at(tx, ty + 1)) ? T.roof[m % T.roof.length][h % 2] : T.wallFront[(m >> 4) & 1];
        case 'D': return m & 256 ? T.doorLocked : T.door;
        case '~': return T.canal[wf];
        case '=': return T.planks;
        case 'f': return T.fence;
        case 'S': return T.stall[(m >> 9) % T.stall.length];
        case 'M': return T.merchTable;
        case 'R': return T.ruinRoof;
        case 'W': return T.ruinWall;
        case 'h': return T.hole;
        case ':': return T.cobble[h % 2];
        case ',': return T.mud[2];
        case 'G': return T.townGrass[h % 2];
        case 'P': return T.townTree;
        case 'w': return T.well;
        default: return T.mud[h % 2];
      }
    }
    switch (c) {
      case 'T': return T.tree[h % 3];
      case '#': return T.cliff;
      case '~': return T.water[wf];
      case 'b': return T.bushTile[h % 2];
      case 'O': return T.boulderTile;
      case 'L': return T.log;
      case 'J': return T.barricade[h % 2];
      case 'q': return T.pebbles;
      case 'y': return T.roadRut;
      case 'Y': return T.hutRoof;
      case 'Z': return T.hutWall;
      case 'D': return T.door;
      case ':': return T.dirt[h % 2];
      case ',': return T.flowers;
      case 'f': return T.fenceWood;
      default: return T.grass[h % 3];
    }
  },

  draw(ctx, cam, time) {
    const tx0 = Math.floor(cam.x / TS), ty0 = Math.floor(cam.y / TS);
    for (let ty = ty0; ty <= ty0 + Math.ceil(H / TS); ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(W / TS); tx++) {
      ctx.drawImage(this.tileImg(this.at(tx, ty), tx, ty, time), tx * TS - Math.round(cam.x), ty * TS - Math.round(cam.y));
    }
  },
};
