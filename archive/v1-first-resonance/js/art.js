'use strict';
// Пиксель-арт: спрайты задаются строками, тайлы генерируются процедурно.

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function spriteFrom(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w, h), x = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, i) => {
    if (ch !== '.' && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); }
  }));
  return c;
}

function flipped(img) {
  const c = makeCanvas(img.width, img.height), x = c.getContext('2d');
  x.translate(img.width, 0); x.scale(-1, 1); x.drawImage(img, 0, 0);
  return c;
}

// Сплошной силуэт спрайта одним цветом (вспышка при попадании)
function silhouette(img, color) {
  const c = makeCanvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}

const HUMAN_BODY = [
  '...hhhh...',
  '..hhhhhhh.',
  '..hhsssss.',
  '..hsssess.',
  '...sssss..',
  '...cccc...',
  '..cccccc..',
  '.scccccccs',
  '.s.cxxcc.s',
  '...cccc...',
  '...pppp...',
];
const HUMAN_LEGS = [
  ['...pp.pp..', '...pp.pp..', '..bbb.bbb.'],
  ['..pp...pp.', '.pp....pp.', '.bbb...bbb'],
];

const PALS = {
  hero: { h: '#3a2a22', s: '#e0b088', e: '#1a1010', c: '#6b6f5a', x: '#4d4f40', p: '#4a3b30', b: '#2a1f1a' },
  boss: { h: '#18161c', s: '#c89878', e: '#1a1010', c: '#7a2e2e', x: '#d4a040', p: '#2e2a36', b: '#141018' },
  thrower: { h: '#4a5238', s: '#8a9070', e: '#ff6030', c: '#5a6048', x: '#3a4030', p: '#5a6048', b: '#2a3020' },
};

const Art = { spr: {}, tiles: {} };

(function buildSprites() {
  const S = Art.spr;
  for (const name in PALS) {
    const frames = HUMAN_LEGS.map(legs => spriteFrom(HUMAN_BODY.concat(legs), PALS[name]));
    S[name] = { r: frames, l: frames.map(flipped) };
  }
  const spiker = spriteFrom([
    '..k.k.k.k.....',
    '.kkkkkkkkk....',
    'kfffffffffff..',
    'fffffffffffff.',
    'ffffffffffewfn',
    'fffffffffffffn',
    '.ffffffffffff.',
    '.ff.ff..ff.ff.',
    '.dd.dd..dd.dd.',
  ], { k: '#e8dcc0', f: '#5a3d2e', e: '#ff3030', w: '#fff4e0', n: '#1e1410', d: '#2a1c14' });
  S.spiker = { r: [spiker], l: [flipped(spiker)] };

  const jumper = spriteFrom([
    '....bbbb....',
    '...bbbbbb...',
    '..bbebbebb..',
    '..bbbbbbbb..',
    '.bbbmmmmbbb.',
    'bbbbbbbbbbbb',
    'b.bbbbbbbb.b',
    'b..bb..bb..b',
    'bb.b....b.bb',
  ], { b: '#d8d0b8', e: '#7cf0ff', m: '#302820' });
  S.jumper = { r: [jumper], l: [flipped(jumper)] };

  S.crystal = spriteFrom(['..l..', '.lcc.', '.lcc.', 'lccdc', '.ccd.', '.cdd.', '..d..'],
    { c: '#7cf0ff', l: '#e0ffff', d: '#2a8aa8' });
  const rockPal = { r: '#8a8a86', l: '#b4b4ae', d: '#5a5a58' };
  S.rock = spriteFrom(['..lll...', '.llrrr..', 'lrrrrrd.', 'lrrrrrdd', 'rrrrrddd', '.rrdddd.', '..ddd...'], rockPal);
  S.pebble = spriteFrom(['.ll.', 'lrrd', '.dd.'], rockPal);
  S.boulder = spriteFrom([
    '....llllll......', '..llllrrrrrr....', '.llrrrrrrrrrrd..', '.lrrrrrrrrrrrdd.',
    'lrrrrrrrrrrrrrdd', 'lrrrrrrrrrrrrrdd', 'lrrrrrrrrrrrrddd', 'rrrrrrrrrrrrrddd',
    'rrrrrrrrrrrrdddd', 'rrrrrrrrrrrddddd', '.rrrrrrrrrdddddd', '.rrrrrrrdddddddd',
    '..rrrrdddddddd..', '....dddddddd....'], rockPal);
  S.crate = spriteFrom([
    'dddddddddddd', 'dlllllllllld', 'dliwwwwwwild', 'dlwdwwwwdwld', 'dlwwdwwdwwld', 'dlwwwddwwwld',
    'dlwwwddwwwld', 'dlwwdwwdwwld', 'dlwdwwwwdwld', 'dliwwwwwwild', 'dwwwwwwwwwwd', 'dddddddddddd',
  ], { w: '#9a6a3a', l: '#c08a50', d: '#4a2e18', i: '#3a3a40' });
  S.herb = spriteFrom(['..l.l..', '.lgggl.', 'lg.g.gl', '.gg.gg.', '..sgs..', '...s...', '..sss..'],
    { g: '#5ac050', l: '#9ae070', s: '#2a6a2a' });
  S.berries = spriteFrom(['..gg...', '.gggg..', 'rr.rr..', 'rRrrRr.', '.rr.rr.'],
    { g: '#3a8a3a', r: '#b01838', R: '#ff6080' });
  const heartRows = ['.rr.rr.', 'rRrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
  S.heart = spriteFrom(heartRows, { r: '#d02040', R: '#ff90a0' });
  S.heartEmpty = spriteFrom(heartRows.map(r => r.replace(/R/g, 'r')), { r: '#3a2030' });
  S.heartHalf = spriteFrom(['.rr.ee.', 'rRrreee', 'rrrreee', '.rrree.', '..rre..', '...r...'],
    { r: '#d02040', R: '#ff90a0', e: '#3a2030' });
  for (const k of ['hero', 'boss', 'thrower', 'spiker', 'jumper']) {
    S[k].flash = { r: S[k].r.map(i => silhouette(i, '#fff')), l: S[k].l.map(i => silhouette(i, '#fff')) };
  }
})();

(function buildTiles() {
  const T = Art.tiles, R = mulberry32(1337);
  const tile = (fn) => { const c = makeCanvas(TS, TS), x = c.getContext('2d'); fn(x); return c; };
  const px = (x, X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  const speckle = (x, base, cols, n) => {
    x.fillStyle = base; x.fillRect(0, 0, TS, TS);
    for (let i = 0; i < n; i++) px(x, (R() * TS) | 0, (R() * TS) | 0, cols[(R() * cols.length) | 0]);
  };
  const grass = (x) => {
    speckle(x, '#2f4a2c', ['#27402a', '#365a33', '#2a4428'], 40);
    for (let i = 0; i < 4; i++) { const X = (R() * 14) | 0, Y = 2 + (R() * 13) | 0; px(x, X, Y, '#44703e'); px(x, X, Y - 1, '#3a6035'); }
  };
  T.grass = [tile(grass), tile(grass), tile(grass)];
  T.flowers = tile(x => {
    grass(x);
    for (let i = 0; i < 3; i++) { const X = 2 + (R() * 12) | 0, Y = 2 + (R() * 12) | 0; px(x, X, Y, i % 2 ? '#d8c060' : '#b070c0'); }
  });
  T.dirt = [tile(x => speckle(x, '#5e4630', ['#6e5438', '#4e3a28', '#735a40'], 50)),
    tile(x => speckle(x, '#5e4630', ['#6e5438', '#4e3a28', '#735a40'], 50))];
  T.tree = [0, 1].map(() => tile(x => {
    grass(x);
    x.fillStyle = '#3a2618'; x.fillRect(6, 11, 4, 5);
    x.fillStyle = '#12241a'; x.beginPath(); x.arc(8, 7, 7.5, 0, 7); x.fill();
    x.fillStyle = '#1e3a24'; x.beginPath(); x.arc(7.5, 6.5, 6, 0, 7); x.fill();
    x.fillStyle = '#2c5230'; x.beginPath(); x.arc(6.5, 5, 3.5, 0, 7); x.fill();
    for (let i = 0; i < 5; i++) px(x, 3 + (R() * 8) | 0, 2 + (R() * 7) | 0, '#3f6e3e');
  }));
  T.wall = tile(x => {
    speckle(x, '#4a4a50', ['#5a5a60', '#3a3a40', '#626268'], 50);
    x.fillStyle = '#2e2e34'; x.fillRect(0, 15, 16, 1); x.fillRect(0, 7, 16, 1); x.fillRect(5, 0, 1, 7); x.fillRect(11, 8, 1, 7);
  });
  T.water = [0, 1].map(f => tile(x => {
    speckle(x, '#1e3c5a', ['#244666', '#1a3450'], 30);
    for (let i = 0; i < 3; i++) { const X = (R() * 12) | 0, Y = (R() * 15) | 0; x.fillStyle = f ? '#5a8ab0' : '#3e6a90'; x.fillRect(X, Y, 3, 1); }
  }));
  T.bridge = tile(x => {
    x.fillStyle = '#1e3c5a'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 16; i += 4) { x.fillStyle = '#7a5530'; x.fillRect(i, 1, 3, 14); x.fillStyle = '#5a3a20'; x.fillRect(i + 3, 1, 1, 14); }
    x.fillStyle = '#3a2614'; x.fillRect(0, 2, 16, 1); x.fillRect(0, 13, 16, 1);
  });
  T.gate = tile(x => {
    speckle(x, '#5e4630', ['#4e3a28'], 20);
    for (let i = 1; i < 16; i += 5) { x.fillStyle = '#6a4424'; x.fillRect(i, 0, 4, 16); x.fillStyle = '#8a6034'; x.fillRect(i, 0, 1, 16); }
    x.fillStyle = '#3a3a44'; x.fillRect(0, 4, 16, 2); x.fillRect(0, 11, 16, 2);
  });
  const plate = (lit) => tile(x => {
    grass(x);
    x.fillStyle = '#3a3a40'; x.fillRect(2, 2, 12, 12);
    x.fillStyle = lit ? '#4a8a9a' : '#5a5a62'; x.fillRect(3, 3, 10, 10);
    x.fillStyle = lit ? '#b0ffff' : '#2e2e34';
    x.fillRect(7, 5, 2, 6); x.fillRect(5, 7, 6, 2);
  });
  T.plate = plate(false); T.plateLit = plate(true);
})();

function drawSpr(ctx, img, x, y) { ctx.drawImage(img, Math.round(x), Math.round(y)); }

function drawShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), w, Math.max(1.5, w * 0.35), 0, 0, 7); ctx.fill();
}
