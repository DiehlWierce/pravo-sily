'use strict';
// Тайловый мир с несколькими сценами (улица, дома, лес). Сцены описаны в scenes.js.
//
// Легенда тайлов:
//  .  пол / земля           ,  декор земли        :  тропа / брусчатка     T  дерево (вне карты — пустота)
//  #  дом / скала / стена   D  дверь              ~  вода / канава         =  мостки
//  f  забор                 S  прилавок           M  стол богатого торговца X  городская стена
//  b  кусты (скрывают)      O  валун              L  поваленный ствол      q  камешки (декор)
//  Y  крыша хижины          Z  стена хижины       R/W/h  руины: крыша, стена, пролом
//  Интерьер: B/V кровать, t стол, k печь, H полка, C сундук, r ковёр, E выход

const World = {
  name: '', theme: 'forest', w: 0, h: 0, grid: [], meta: [], tint: null,

  load(def) {
    this.name = def.name; this.theme = def.theme; this.w = def.w; this.h = def.h; this.tint = def.tint || null;
    this.grid = []; this.meta = new Array(def.w * def.h).fill(0);
    for (let y = 0; y < def.h; y++) this.grid.push(new Array(def.w).fill(def.fill || '.'));
    this.spawns = def.build(this.painter());
    this.spawns.forEach((s, i) => { s.id = s.id || `${def.name}:${s[0]}:${s[1]},${s[2]}`; });
  },

  painter() {
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.grid[y][x] = c; };
    return {
      set,
      rect: (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); },
      circle: (cx, cy, r, c) => {
        for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r) set(x, y, c);
      },
      get: (x, y) => this.at(x, y),
      meta: (x, y, v) => { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.meta[y * this.w + x] = v; },
      rng: mulberry32([...(this.name)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0),
    };
  },

  get pxW() { return this.w * TS; },
  get pxH() { return this.h * TS; },
  at(tx, ty) { return (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) ? 'T' : this.grid[ty][tx]; },
  atPx(x, y) { return this.at(Math.floor(x / TS), Math.floor(y / TS)); },
  set(tx, ty, c) { if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.grid[ty][tx] = c; },

  solidWalk(c) { return 'T#D~fSMXOLYZRWBVtkHCcd'.includes(c); },
  solidFly(c) { return 'T#DSMXOLYZRWBVtkHCcd'.includes(c); },
  blocksSight(c) { return 'T#DSMXOYZRWHd'.includes(c); },   // кусты обзор не перекрывают: иначе звери в чаще слепнут

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
        case 'S': return T.stall;
        case 'M': return T.merchTable;
        case 'R': return T.ruinRoof;
        case 'W': return T.ruinWall;
        case 'h': return T.hole;
        case ':': return T.cobble[h % 2];
        case ',': return T.mud[2];
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
      case 'q': return T.pebbles;
      case 'y': return T.roadRut;
      case 'Y': return T.hutRoof;
      case 'Z': return T.hutWall;
      case 'D': return T.door;
      case ':': return T.dirt[h % 2];
      case ',': return T.flowers;
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
