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
function scaled(img, k) {
  const c = makeCanvas(img.width * k, img.height * k), x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
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
  mother: { h: '#6a5040', s: '#d8a888', e: '#1a1010', c: '#8a7a6a', x: '#6a5a4a', p: '#6a5a4a', b: '#3a2a20' },
  father: { h: '#4a3a30', s: '#c8a080', e: '#1a1010', c: '#5a5040', x: '#3a3228', p: '#3a3228', b: '#221a14' },
  oldman: { h: '#b8b0a0', s: '#c8a078', e: '#1a1010', c: '#5a4a3a', x: '#3a3028', p: '#4a3b30', b: '#2a1f1a' },
  baker: { h: '#a03030', s: '#e8b890', e: '#1a1010', c: '#d8d0c0', x: '#a03030', p: '#6a5040', b: '#3a2a20' },
  dealer: { h: '#2a2a30', s: '#c09070', e: '#1a1010', c: '#5a5a60', x: '#8a7a50', p: '#3a3a40', b: '#1a1a20' },
  drunk: { h: '#5a4030', s: '#e08878', e: '#1a1010', c: '#7a5a3a', x: '#5a4028', p: '#3a3a4a', b: '#2a2020' },
  merchant: { h: '#2a1a10', s: '#e0b890', e: '#1a1010', c: '#5a2a6a', x: '#e0c050', p: '#2a2040', b: '#1a1010' },
  thug: { h: '#1a1a1e', s: '#b08868', e: '#1a1010', c: '#2e2a28', x: '#5a4a3a', p: '#26222a', b: '#141014' },
  collector: { h: '#101014', s: '#a87858', e: '#ff3030', c: '#6a1e1e', x: '#c0a040', p: '#1e1a22', b: '#0e0a0e' },
  hunter: { h: '#4a3a20', s: '#c89870', e: '#1a1010', c: '#4a5a34', x: '#7a5a30', p: '#3a3226', b: '#221a12' },
  widow: { h: '#2a2a2e', s: '#d8b090', e: '#1a1010', c: '#2e2e36', x: '#4a4a56', p: '#2e2e36', b: '#1a1a1e' },
  soldier: { h: '#8a8a80', s: '#c09070', e: '#1a1010', c: '#4a5a6a', x: '#a08a40', p: '#3a3a3a', b: '#1e1e1e' },
  grumpy: { h: '#6a3a2a', s: '#d09a80', e: '#1a1010', c: '#6a6a4a', x: '#4a4a30', p: '#4a3a2a', b: '#2a1e14' },
  junkwoman: { h: '#9a9a9a', s: '#c8a088', e: '#1a1010', c: '#7a5a6a', x: '#5a3a4a', p: '#5a4a40', b: '#2a2020' },
  apothecary: { h: '#e0e0d8', s: '#e0c0a0', e: '#1a1010', c: '#3a6a5a', x: '#c0d0a0', p: '#2a3a34', b: '#1a2020' },
  boy: { h: '#c08040', s: '#e8b890', e: '#1a1010', c: '#8a6a40', x: '#5a4028', p: '#4a3a30', b: '#2a1f1a' },
  washer: { h: '#5a3020', s: '#e0a888', e: '#1a1010', c: '#6a8aa0', x: '#e0e0e0', p: '#4a5a6a', b: '#2a2a2a' },
  fruiter: { h: '#303030', s: '#c89878', e: '#1a1010', c: '#5a7a3a', x: '#c0a030', p: '#3a3a2a', b: '#1e1e14' },
  clother: { h: '#7a4a8a', s: '#e0b898', e: '#1a1010', c: '#a05a7a', x: '#e0c0e0', p: '#4a3a4a', b: '#2a1e2a' },
  carter: { h: '#5a4a2a', s: '#c89060', e: '#1a1010', c: '#6a5a3a', x: '#3a3020', p: '#4a3a24', b: '#2a2014' },
  guard: { h: '#8a8a96', s: '#c09070', e: '#1a1010', c: '#4a5a7a', x: '#b0b8c8', p: '#2e3444', b: '#1a1e26' },
  clerk: { h: '#2a2a2e', s: '#d8b088', e: '#1a1010', c: '#3a4a6a', x: '#c0a040', p: '#2a3040', b: '#1a1a20' },
  barkeep: { h: '#6a3a20', s: '#e0b088', e: '#1a1010', c: '#8a6a4a', x: '#d8d0c0', p: '#5a4a34', b: '#2a2018' },
  hunterB: { h: '#3a2a1a', s: '#b08860', e: '#1a1010', c: '#5a4a2a', x: '#8a7a40', p: '#3a3020', b: '#241c12' },
  villager: { h: '#7a5a3a', s: '#d8a880', e: '#1a1010', c: '#6a6a5a', x: '#4a4a3a', p: '#4a4030', b: '#2a2418' },
  smith: { h: '#3a2a20', s: '#c08858', e: '#1a1010', c: '#5a3a24', x: '#8a8a90', p: '#3a2e22', b: '#241a12' },
  kindwoman: { h: '#b07040', s: '#e8c0a0', e: '#1a1010', c: '#b0a070', x: '#806a40', p: '#6a5a40', b: '#3a2a1a' },
};

const Art = { spr: {}, tiles: {} };

(function buildSprites() {
  const S = Art.spr;
  for (const name in PALS) {
    const frames = HUMAN_LEGS.map(legs => spriteFrom(HUMAN_BODY.concat(legs), PALS[name]));
    S[name] = { r: frames, l: frames.map(flipped) };
  }
  const creature = (name, rows, pal) => { const i = spriteFrom(rows, pal); S[name] = { r: [i], l: [flipped(i)] }; return i; };

  creature('spiker', [
    '..k.k.k.k.....', '.kkkkkkkkk....', 'kfffffffffff..', 'fffffffffffff.', 'ffffffffffewfn',
    'fffffffffffffn', '.ffffffffffff.', '.ff.ff..ff.ff.', '.dd.dd..dd.dd.',
  ], { k: '#e8dcc0', f: '#4a2e2a', e: '#ff3030', w: '#fff4e0', n: '#1e1410', d: '#2a1c14' });
  creature('boar', [
    '..............', '..ffffffff....', '.fffffffffff..', 'fffffffffffff.', 'ffffffffffeffn',
    'fffffffffffwfn', '.ffffffffffff.', '.ff.ff..ff.ff.', '.dd.dd..dd.dd.',
  ], { f: '#6a4a30', e: '#101010', w: '#f0e8d0', n: '#2a1c14', d: '#2a1c14' });
  creature('rabbit', [
    '.....ll.', '.....ll.', '..bbbbb.', '.bbbbbeb', 'wbbbbbbn', '.bbbbbb.', '.b..b...',
  ], { b: '#9a8a70', l: '#b8a890', e: '#101010', w: '#f0f0f0', n: '#d08080' });
  // Костяной прыгун — хищный зверь с костяными пластинами на спине и когтями
  const jumper = creature('jumper', [
    '...........pp.',
    '..........pfpe',
    '....pppppffffm',
    '..pppfffffffmm',
    '.pffffffffff..',
    'pffffffffff...',
    '.fff.fffff.f..',
    '.ff...ff...ff.',
    '.ff...ff....f.',
    'kk.k.kk.k..kk.',
  ], { p: '#d8d0b8', f: '#5a4a3c', e: '#ffb030', m: '#f0f0e0', k: '#e8e0d0' });
  const big = scaled(jumper, 2); S.bigJumper = { r: [big], l: [flipped(big)] };
  // Метатель — дикобразоподобный зверь, выстреливает шипы
  creature('thrower', [
    '..q.Q.q.Q...',
    '.qQqQqQqQq..',
    'qQfqfqfqfqq.',
    'qffffffffffe',
    'fffffffffffn',
    '.ffffffffff.',
    '.k.k...k.k..',
  ], { q: '#d8cca0', Q: '#6a5a40', f: '#3e3028', e: '#ff6030', n: '#1a1010', k: '#2a2018' });

  S.crystal = spriteFrom(['..l..', '.lcc.', '.lcc.', 'lccdc', '.ccd.', '.cdd.', '..d..'], { c: '#7cf0ff', l: '#e0ffff', d: '#2a8aa8' });
  const rockPal = { r: '#8a8a86', l: '#b4b4ae', d: '#5a5a58' };
  S.rock = spriteFrom(['..lll...', '.llrrr..', 'lrrrrrd.', 'lrrrrrdd', 'rrrrrddd', '.rrdddd.', '..ddd...'], rockPal);
  S.boulder = spriteFrom([
    '....llllll......', '..llllrrrrrr....', '.llrrrrrrrrrrd..', '.lrrrrrrrrrrrdd.', 'lrrrrrrrrrrrrrdd',
    'lrrrrrrrrrrrrrdd', 'lrrrrrrrrrrrrddd', 'rrrrrrrrrrrrrddd', 'rrrrrrrrrrrrdddd', 'rrrrrrrrrrrddddd',
    '.rrrrrrrrrdddddd', '.rrrrrrrdddddddd', '..rrrrdddddddd..', '....dddddddd....'], rockPal);
  S.stone = S.boulder;
  S.crate = spriteFrom([
    'dddddddddddd', 'dlllllllllld', 'dliwwwwwwild', 'dlwdwwwwdwld', 'dlwwdwwdwwld', 'dlwwwddwwwld',
    'dlwwwddwwwld', 'dlwwdwwdwwld', 'dlwdwwwwdwld', 'dliwwwwwwild', 'dwwwwwwwwwwd', 'dddddddddddd',
  ], { w: '#9a6a3a', l: '#c08a50', d: '#4a2e18', i: '#3a3a40' });
  S.barrel = spriteFrom(['.dwwwwd.', 'dwwlwwwd', 'iiiiiiii', 'dwwlwwwd', 'dwwlwwwd', 'iiiiiiii', 'dwwlwwwd', '.dwwwwd.'],
    { w: '#8a5a30', l: '#aa7a48', d: '#4a2e18', i: '#3a3a40' });
  S.junk = spriteFrom([
    '......g.......', '...t..gg..m...', '..tttbbgg.mm..', '.ttbbbbwwbbmm.', 'ttbbwbbbbbbbbm', 'bbbbbbbbbbbbbb', '.bbbbbbbbbbbb.'],
    { t: '#6a6a5a', b: '#4a3e30', g: '#3a8a5a', w: '#c8c0a8', m: '#7a4a2a' });
  S.bush = spriteFrom([
    '....gggg....', '..gggllggg..', '.gglllgggdg.', 'gglgggggdggg', 'gggggggddggg', 'ggggdggggggd', '.gdggggdggg.', '..dddddddd..'],
    { g: '#2c5230', l: '#4a7a44', d: '#1a3320' });
  S.herb = spriteFrom(['..l.l..', '.lgggl.', 'lg.g.gl', '.gg.gg.', '..sgs..', '...s...', '..sss..'], { g: '#5ac050', l: '#9ae070', s: '#2a6a2a' });
  S.berries = spriteFrom(['..gg...', '.gggg..', 'rr.rr..', 'rRrrRr.', '.rr.rr.'], { g: '#3a8a3a', r: '#b01838', R: '#ff6080' });
  // Иконки предметов
  S.coin = spriteFrom(['.ooo.', 'oOooo', 'oOooo', 'ooood', '.ddd.'], { o: '#d0a040', O: '#fff0a0', d: '#8a6020' });
  S.bread = spriteFrom(['..bbbb..', '.bBbBbb.', 'bbbbbbbb', 'dbbbbbbd', '.dddddd.'], { b: '#c08040', B: '#e0b070', d: '#7a4a20' });
  S.meatRaw = spriteFrom(['.rrrr..', 'rRrrrr.', 'rrrrrrw', '.rrrrww', '..rr.w.'], { r: '#b83a4a', R: '#e88090', w: '#e8e0d0' });
  S.meatCooked = spriteFrom(['.bbbb..', 'bBbbbb.', 'bbbbbbw', '.bbbbww', '..bb.w.'], { b: '#8a4a20', B: '#c08040', w: '#e8e0d0' });
  S.scroll = spriteFrom(['dpppp.d', '.ppppp.', '.pl.lp.', '.ppppp.', '.p.llp.', '.pppp..', 'd.pppd.'], { p: '#d0c090', l: '#6a5a40', d: '#5a3a20' });
  S.pendant = spriteFrom(['.ooo.', 'o...o', '.o.o.', '..c..', '.cCc.', '..c..'], { o: '#c0a040', c: '#b070ff', C: '#f0d0ff' });
  S.junkItem = spriteFrom(['..mm...', '.mmmm..', 'mm..mm.', '.mmmm..', '..mmtt.', '....tt.'], { m: '#7a6a5a', t: '#aa5a3a' });
  S.lantern = spriteFrom(['.d.', 'dyd', 'dYd', '.d.'], { d: '#3a3a3a', y: '#ffc050', Y: '#fff0a0' });
  S.apple = spriteFrom(['..g...', '.rrRr.', 'rrrrRr', 'rrrrrr', '.rrrr.'], { g: '#3a7a2a', r: '#b82a2a', R: '#f08080' });
  S.cloth = spriteFrom(['ppppppl', 'pPpPppl', 'ppppppl', 'pPpPppl', 'dddddd.'], { p: '#8a3a6a', P: '#c070a0', l: '#e0c0e0', d: '#5a2a4a' });
  S.vial = spriteFrom(['.c.', '.g.', 'ggg', 'gGg', 'ggg'], { c: '#6a4a2a', g: '#5aa080', G: '#c0f0e0' });
  S.medicine = spriteFrom(['.dd.', '.cc.', 'aaaa', 'awwa', 'aaaa', 'aaaa'], { d: '#3a2a1a', c: '#8a6a40', a: '#6a3a8a', w: '#e0d0f0' });
  S.spike = spriteFrom(['Qqqqq'], { q: '#e0d4a8', Q: '#5a4a30' });
  // Значки шкал
  S.iconBolt = spriteFrom(['..yy', '.yy.', 'yyyy', '.yy.', 'yy..'], { y: '#ffd040' });
  // Глава 2: повозка, лошадь, доска заказов, мешки
  S.cart = spriteFrom([
    '..wwwwwwwwww..', '.wwddddddddww.', 'wwddddddddddww', 'wwddddddddddww', '.wwddddddddww.',
    '..wwwwwwwwww..', '.ii........ii.', 'iIIi......iIIi', 'iIIi......iIIi', '.ii........ii.',
  ], { w: '#8a6a3a', d: '#5a4020', i: '#3a2a18', I: '#6a5a40' });
  S.horse = spriteFrom([
    '...........hh.', '..........hhhh', '.bbbbbbbbbbhem', 'bbbbbbbbbbbbbb', 'bbbbbbbbbbbb..',
    '.bb.bb....bb..', '.bb.bb....bb..', '.dd.dd....dd..',
  ], { b: '#6a4a30', h: '#4a3020', e: '#101010', m: '#2a1c14', d: '#2a1c14' });
  S.board = spriteFrom([
    'dddddddddddd', 'dwwwwwwwwwwd', 'dwppwwppwwwd', 'dwppwwppwwwd', 'dwwwwwwwwppd',
    'dwppwwwwwppd', 'dwppwwwwwwwd', 'dddddddddddd', '..dd....dd..',
  ], { d: '#4a3220', w: '#6a5030', p: '#e0d8c0' });
  S.sack = spriteFrom(['..sss..', '.sssss.', 'ssssssd', 'ssssssd', 'sssssdd', '.sdddd.'], { s: '#b0a070', d: '#6a5a40' });
  S.iconSword = spriteFrom(['......w', '.....wl', '....wl.', '...wl..', 'h.wl...', '.hh....', 'bhh....'], { w: '#e0e4e8', l: '#8a929a', h: '#8a6a3a', b: '#5a3a1a' });
  S.iconArmor = spriteFrom(['.aa.aa.', 'aaaaaaa', 'aAaaaAa', '.aaaaa.', '.aaaaa.', '.aa.aa.'], { a: '#7a5a3a', A: '#b08a5a' });
  S.iconKnives = spriteFrom(['w...w..', '.w...w.', '..w...w', '...h...', '....h..'], { w: '#d8dce0', h: '#6a4a2a' });
  S.iconCloud = spriteFrom(['.ggg..', 'gGgggg', 'gggggg', '.gg.g.'], { g: '#7ac04a', G: '#b8f070' });

  const heartRows = ['.rr.rr.', 'rRrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
  S.heart = spriteFrom(heartRows, { r: '#d02040', R: '#ff90a0' });
  S.heartEmpty = spriteFrom(heartRows.map(r => r.replace(/R/g, 'r')), { r: '#3a2030' });
  S.heartHalf = spriteFrom(['.rr.ee.', 'rRrreee', 'rrrreee', '.rrree.', '..rre..', '...r...'], { r: '#d02040', R: '#ff90a0', e: '#3a2030' });
  for (const k in S) if (S[k].r) S[k].flash = { r: S[k].r.map(i => silhouette(i, '#fff')), l: S[k].l.map(i => silhouette(i, '#fff')) };
})();

(function buildTiles() {
  const T = Art.tiles, R = mulberry32(1337), spr = Art.spr;
  const tile = (fn) => { const c = makeCanvas(TS, TS), x = c.getContext('2d'); fn(x); return c; };
  const px = (x, X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  const speckle = (x, base, cols, n) => {
    x.fillStyle = base; x.fillRect(0, 0, TS, TS);
    for (let i = 0; i < n; i++) px(x, (R() * TS) | 0, (R() * TS) | 0, cols[(R() * cols.length) | 0]);
  };
  T.void = tile(x => { x.fillStyle = '#07060a'; x.fillRect(0, 0, TS, TS); });

  // ---- Лес ----
  const grass = (x) => {
    speckle(x, '#2f4a2c', ['#27402a', '#365a33', '#2a4428'], 40);
    for (let i = 0; i < 4; i++) { const X = (R() * 14) | 0, Y = 2 + (R() * 13) | 0; px(x, X, Y, '#44703e'); px(x, X, Y - 1, '#3a6035'); }
  };
  T.grass = [tile(grass), tile(grass), tile(grass)];
  T.flowers = tile(x => { grass(x); for (let i = 0; i < 3; i++) px(x, 2 + (R() * 12) | 0, 2 + (R() * 12) | 0, i % 2 ? '#d8c060' : '#b070c0'); });
  const dirt = (x) => speckle(x, '#5e4630', ['#6e5438', '#4e3a28', '#735a40'], 50);
  T.dirt = [tile(dirt), tile(dirt)];
  T.tree = [0, 1, 2].map(v => tile(x => {
    grass(x);
    x.fillStyle = '#3a2618'; x.fillRect(6, 11, 4, 5);
    const dark = ['#12241a', '#142a1c', '#10201a'][v], mid = ['#1e3a24', '#23402a', '#1a3422'][v];
    x.fillStyle = dark; x.beginPath(); x.arc(8, 7, 7.5, 0, 7); x.fill();
    x.fillStyle = mid; x.beginPath(); x.arc(7.5, 6.5, 6, 0, 7); x.fill();
    x.fillStyle = '#2c5230'; x.beginPath(); x.arc(6.5, 5, 3.5, 0, 7); x.fill();
    for (let i = 0; i < 5; i++) px(x, 3 + (R() * 8) | 0, 2 + (R() * 7) | 0, '#3f6e3e');
  }));
  T.bushTile = [tile(x => { grass(x); x.drawImage(spr.bush, 2, 6); }), tile(x => { grass(x); x.drawImage(spr.bush, 1, 5); x.fillStyle = '#b01838'; x.fillRect(5, 8, 1, 1); x.fillRect(9, 10, 1, 1); })];
  T.boulderTile = tile(x => { grass(x); x.drawImage(spr.boulder, 0, 2); });
  T.log = tile(x => {
    grass(x);
    x.fillStyle = '#3a2618'; x.fillRect(0, 7, 16, 7); x.fillStyle = '#5a3a22'; x.fillRect(0, 7, 16, 2);
    x.fillStyle = '#2a1a10'; x.fillRect(0, 12, 16, 2); x.fillStyle = '#4a6a3a'; x.fillRect(3, 6, 3, 1); x.fillRect(11, 6, 2, 1);
  });
  T.pebbles = tile(x => { grass(x); for (let i = 0; i < 4; i++) { const X = 2 + (R() * 11) | 0, Y = 3 + (R() * 10) | 0; x.fillStyle = '#6a6a66'; x.fillRect(X, Y, 2, 1); x.fillStyle = '#9a9a94'; x.fillRect(X, Y - 1, 1, 1); } });
  T.cliff = tile(x => {
    speckle(x, '#4a4a50', ['#5a5a60', '#3a3a40', '#626268'], 50);
    x.fillStyle = '#2e2e34'; x.fillRect(0, 15, 16, 1); x.fillRect(0, 7, 16, 1); x.fillRect(5, 0, 1, 7); x.fillRect(11, 8, 1, 7);
  });
  T.water = [0, 1].map(f => tile(x => {
    speckle(x, '#1e3c5a', ['#244666', '#1a3450'], 30);
    for (let i = 0; i < 3; i++) { x.fillStyle = f ? '#5a8ab0' : '#3e6a90'; x.fillRect((R() * 12) | 0, (R() * 15) | 0, 3, 1); }
  }));
  T.hutRoof = tile(x => {
    x.fillStyle = '#6a5a30'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 3) { x.fillStyle = '#4a3a20'; x.fillRect(0, yy + 2, 16, 1); for (let i = 0; i < 5; i++) px(x, (R() * 16) | 0, yy + ((R() * 2) | 0), '#8a7a48'); }
  });
  T.hutWall = tile(x => {
    x.fillStyle = '#4a3220'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 4) { x.fillStyle = '#6a4a2c'; x.fillRect(0, yy, 16, 3); x.fillStyle = '#2a1a10'; x.fillRect(0, yy + 3, 16, 1); }
  });

  // ---- Трущобы ----
  const mud = (x) => speckle(x, '#4a3e34', ['#55483c', '#3e342c', '#5c4e40', '#3a3a30'], 45);
  T.mud = [tile(mud), tile(mud), tile(x => { mud(x); x.fillStyle = '#3a3228'; x.fillRect((R() * 10) | 0, (R() * 12) | 0, 5, 2); })];
  T.cobble = [0, 1].map(() => tile(x => {
    x.fillStyle = '#3a3634'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 4) for (let xx = (yy / 4) % 2 * 2; xx < 16; xx += 4) {
      x.fillStyle = ['#6a625a', '#5a544e', '#726a60'][(R() * 3) | 0]; x.fillRect(xx, yy, 3, 3);
    }
  }));
  const roofCols = [['#553a2c', '#4a3228', '#6a4a38'], ['#3e4450', '#363b46', '#565c6a'], ['#5a2e2a', '#4e2824', '#743e38'], ['#4a4a36', '#40402e', '#626248']];
  T.roof = roofCols.map(([a, b, hi]) => [a, b].map(base => tile(x => {
    x.fillStyle = base; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 4) { x.fillStyle = '#1e1612'; x.fillRect(0, yy + 3, 16, 1); for (let xx = (yy / 4) % 2 * 4; xx < 16; xx += 8) x.fillRect(xx, yy, 1, 3); }
    for (let i = 0; i < 6; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, hi);
  })));
  T.wallFront = [0, 1].map(v => tile(x => {
    x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 16, 16);
    for (let xx = 0; xx < 16; xx += 4) { x.fillStyle = '#4a3220'; x.fillRect(xx, 0, 1, 16); }
    x.fillStyle = '#2e2018'; x.fillRect(0, 0, 16, 2);
    if (v) { x.fillStyle = '#1a1410'; x.fillRect(5, 5, 6, 5); x.fillStyle = '#e0a050'; x.fillRect(6, 6, 4, 3); x.fillStyle = '#4a3220'; x.fillRect(7, 5, 1, 5); }
  }));
  T.door = tile(x => {
    x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#2e2018'; x.fillRect(0, 0, 16, 2);
    x.fillStyle = '#3a2618'; x.fillRect(3, 3, 10, 13); x.fillStyle = '#5a3a20'; x.fillRect(4, 4, 8, 12); x.fillStyle = '#c0a040'; x.fillRect(10, 10, 1, 2);
  });
  T.doorLocked = tile(x => { x.drawImage(T.door, 0, 0); x.fillStyle = '#2a2a2e'; x.fillRect(4, 8, 8, 2); });
  T.ruinRoof = tile(x => { speckle(x, '#1e1a18', ['#2a2420', '#3a2a20', '#140e0c'], 60); x.fillStyle = '#4a2a18'; x.fillRect(2, 5, 9, 2); x.fillRect(8, 10, 6, 2); });
  T.ruinWall = tile(x => {
    x.fillStyle = '#2a1e16'; x.fillRect(0, 0, 16, 16);
    for (let xx = 0; xx < 16; xx += 4) { x.fillStyle = '#1a120c'; x.fillRect(xx, 0, 1, 16); }
    for (let i = 0; i < 20; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, '#0e0a08');
  });
  T.hole = tile(x => { mud(x); x.fillStyle = '#2a1e16'; x.fillRect(0, 0, 3, 16); x.fillRect(13, 0, 3, 16); x.fillStyle = '#120c08'; x.fillRect(3, 0, 10, 4); for (let i = 0; i < 8; i++) px(x, 3 + (R() * 10) | 0, 4 + (R() * 10) | 0, '#6a4a30'); });
  T.canal = [0, 1].map(f => tile(x => {
    speckle(x, '#2e3424', ['#353c28', '#262c1e'], 30);
    for (let i = 0; i < 2; i++) { x.fillStyle = f ? '#5a6040' : '#4a5034'; x.fillRect((R() * 12) | 0, (R() * 15) | 0, 3, 1); }
  }));
  T.planks = tile(x => {
    x.fillStyle = '#2e3424'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 16; i += 4) { x.fillStyle = '#7a5530'; x.fillRect(1, i, 14, 3); x.fillStyle = '#5a3a20'; x.fillRect(1, i + 3, 14, 1); }
  });
  T.fence = tile(x => {
    mud(x); x.fillStyle = '#5a3e24'; x.fillRect(0, 6, 16, 2); x.fillRect(0, 11, 16, 2);
    for (let i = 1; i < 16; i += 5) { x.fillStyle = '#6a4a2c'; x.fillRect(i, 3, 3, 12); x.fillStyle = '#3a2614'; x.fillRect(i + 2, 3, 1, 12); }
  });
  T.townWall = tile(x => {
    speckle(x, '#4a4640', ['#5a5650', '#3a3630'], 40);
    x.fillStyle = '#2a2622'; for (let yy = 3; yy < 16; yy += 5) x.fillRect(0, yy, 16, 1);
    x.fillRect(4, 0, 1, 3); x.fillRect(12, 4, 1, 4); x.fillRect(6, 9, 1, 4);
  });
  T.stall = tile(x => {
    x.drawImage(T.cobble[0], 0, 0);
    x.fillStyle = '#5a3a20'; x.fillRect(0, 6, 16, 10); x.fillStyle = '#7a5530'; x.fillRect(0, 6, 16, 3);
    x.fillStyle = '#a03030'; x.fillRect(0, 0, 16, 5); x.fillStyle = '#e0d0b0'; for (let i = 0; i < 16; i += 4) x.fillRect(i, 0, 2, 5);
  });
  T.merchTable = tile(x => {
    x.drawImage(T.cobble[1], 0, 0);
    x.fillStyle = '#3a2a1a'; x.fillRect(0, 5, 16, 11); x.fillStyle = '#5a2a6a'; x.fillRect(0, 4, 16, 8);
    x.fillStyle = '#e0c050'; x.fillRect(0, 11, 16, 1); x.fillStyle = '#7a4a8a'; x.fillRect(0, 4, 16, 2);
  });

  // ---- Интерьеры ----
  const floor = (x) => {
    x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 4) { x.fillStyle = '#4a3220'; x.fillRect(0, yy + 3, 16, 1); x.fillRect(((yy * 7) % 12) + 2, yy, 1, 3); }
    for (let i = 0; i < 6; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, '#7a5a3a');
  };
  T.floor = [tile(floor), tile(floor)];
  T.wallTopI = tile(x => { x.fillStyle = '#2a1e16'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#3a2a1e'; for (let i = 0; i < 16; i += 5) x.fillRect(i, 0, 3, 16); });
  T.wallFrontI = tile(x => {
    x.fillStyle = '#5a4030'; x.fillRect(0, 0, 16, 16);
    for (let xx = 0; xx < 16; xx += 4) { x.fillStyle = '#3e2c20'; x.fillRect(xx, 0, 1, 14); }
    x.fillStyle = '#2a1e16'; x.fillRect(0, 13, 16, 3);
  });
  T.rug = tile(x => { floor(x); x.fillStyle = '#6a2a2a'; x.fillRect(1, 2, 14, 12); x.fillStyle = '#9a5a3a'; x.fillRect(3, 4, 10, 8); x.fillStyle = '#6a2a2a'; x.fillRect(5, 6, 6, 4); });
  T.exitMat = tile(x => { floor(x); x.fillStyle = '#3a3a2a'; x.fillRect(2, 5, 12, 9); x.fillStyle = '#d8c890'; x.fillRect(7, 7, 2, 4); x.fillRect(5, 9, 6, 1); x.fillRect(6, 10, 4, 1); });
  T.bedTop = tile(x => { floor(x); x.fillStyle = '#3a2618'; x.fillRect(1, 1, 14, 15); x.fillStyle = '#e8e0d0'; x.fillRect(3, 2, 10, 5); x.fillStyle = '#6a7a5a'; x.fillRect(2, 8, 12, 8); });
  T.bedFoot = tile(x => { floor(x); x.fillStyle = '#3a2618'; x.fillRect(1, 0, 14, 14); x.fillStyle = '#6a7a5a'; x.fillRect(2, 0, 12, 11); x.fillStyle = '#5a6a4a'; x.fillRect(2, 5, 12, 1); });
  T.table = tile(x => { floor(x); x.fillStyle = '#2e1e12'; x.fillRect(2, 11, 2, 5); x.fillRect(12, 11, 2, 5); x.fillStyle = '#8a6040'; x.fillRect(0, 3, 16, 8); x.fillStyle = '#a07850'; x.fillRect(0, 3, 16, 2); });
  T.stove = tile(x => { floor(x); x.fillStyle = '#4a4a4a'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#6a6a66'; x.fillRect(1, 1, 14, 3); x.fillStyle = '#1a1010'; x.fillRect(4, 7, 8, 6); x.fillStyle = '#ff8030'; x.fillRect(5, 10, 6, 3); x.fillStyle = '#ffd060'; x.fillRect(7, 11, 2, 2); });
  T.shelf = tile(x => {
    x.drawImage(T.wallFrontI, 0, 0); x.fillStyle = '#3a2618'; x.fillRect(0, 5, 16, 2); x.fillRect(0, 11, 16, 2);
    const cols = ['#5aa080', '#a05a5a', '#c0a050', '#6a6aa0'];
    for (let i = 0; i < 4; i++) { x.fillStyle = cols[(R() * 4) | 0]; x.fillRect(1 + i * 4, 1, 2, 4); x.fillStyle = cols[(R() * 4) | 0]; x.fillRect(2 + i * 4, 8, 2, 3); }
  });
  T.roadRut = tile(x => {
    speckle(x, '#6a5a44', ['#7a6a50', '#5a4a38', '#806e54'], 45);
    x.fillStyle = '#4e4030'; x.fillRect(0, 3, 16, 2); x.fillRect(0, 11, 16, 2);
    for (let i = 0; i < 5; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, '#8a7a60');
  });
  T.stoneFloor = [0, 1].map(() => tile(x => {
    x.fillStyle = '#4a4640'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 8) for (let xx = (yy / 8) % 2 * 4; xx < 16; xx += 8) {
      x.fillStyle = ['#5e5a52', '#565248', '#66625a'][(R() * 3) | 0]; x.fillRect(xx, yy, 7, 7);
    }
  }));
  T.counter = tile(x => {
    x.fillStyle = '#5a4030'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#8a6a44'; x.fillRect(0, 2, 16, 9); x.fillStyle = '#a88a5a'; x.fillRect(0, 2, 16, 2);
    x.fillStyle = '#3a2a1a'; x.fillRect(0, 11, 16, 5);
  });
  T.boardTile = tile(x => { x.drawImage(T.wallFrontI, 0, 0); x.drawImage(Art.spr.board, 2, 3); });
  T.chest = tile(x => { floor(x); x.fillStyle = '#3a2410'; x.fillRect(2, 5, 12, 10); x.fillStyle = '#7a5028'; x.fillRect(3, 6, 10, 8); x.fillStyle = '#5a3818'; x.fillRect(3, 9, 10, 1); x.fillStyle = '#c0a040'; x.fillRect(7, 9, 2, 2); });
})();

function drawSpr(ctx, img, x, y) { ctx.drawImage(img, Math.round(x), Math.round(y)); }
function drawShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), w, Math.max(1.5, w * 0.35), 0, 0, 7); ctx.fill();
}
