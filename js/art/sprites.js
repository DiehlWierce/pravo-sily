'use strict';
// Спрайты рисуются кодом: строки-маски + палитры. При переносе в Godot каждый набор станет SpriteFrames,
// имена (ключи Art.spr) сохраняются — по ним ищутся анимации.

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

// ---------- Люди: одно тело, разные палитры ----------
// h — волосы, s — кожа, e — глаза, c — одежда, x — пояс/узор, p — штаны, b — обувь
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
  girl: { h: '#e0c060', s: '#f0c8a0', e: '#1a1010', c: '#a04a4a', x: '#e0d0b0', p: '#a04a4a', b: '#3a2a20' },
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
  // Город второй главы
  noble: { h: '#d0b060', s: '#f0c8a8', e: '#1a1010', c: '#2a4a8a', x: '#e0c050', p: '#1e2a4a', b: '#141418' },
  lady: { h: '#5a2a1a', s: '#f0c8a8', e: '#1a1010', c: '#8a2a4a', x: '#e0c0a0', p: '#8a2a4a', b: '#2a1418' },
  priest: { h: '#c8c8c0', s: '#e0b890', e: '#1a1010', c: '#2a2a30', x: '#c0a040', p: '#2a2a30', b: '#141418' },
  tailor: { h: '#3a2a3a', s: '#e8c0a0', e: '#1a1010', c: '#4a7a7a', x: '#e0e0c0', p: '#3a4a4a', b: '#1e2222' },
  fishmonger: { h: '#6a6a60', s: '#c89070', e: '#1a1010', c: '#3a5a6a', x: '#8ab0c0', p: '#3a3a3a', b: '#1e1e1e' },
  porter: { h: '#4a3020', s: '#b88058', e: '#1a1010', c: '#8a7a5a', x: '#5a4a30', p: '#4a3a28', b: '#2a1e14' },
  oldlady: { h: '#d8d8d0', s: '#d8b090', e: '#1a1010', c: '#5a4a6a', x: '#8a7a9a', p: '#5a4a6a', b: '#2a2028' },
  scribe: { h: '#5a4a3a', s: '#e0c0a0', e: '#1a1010', c: '#6a5a4a', x: '#d8d0b0', p: '#3a3028', b: '#1e1a14' },
};
const HUMANS = Object.keys(PALS);

const Art = { spr: {}, tiles: {} };

(function buildSprites() {
  const S = Art.spr;
  for (const name in PALS) {
    const frames = HUMAN_LEGS.map(legs => spriteFrom(HUMAN_BODY.concat(legs), PALS[name]));
    S[name] = { r: frames, l: frames.map(flipped) };
  }
  // Существо: один или несколько кадров, смотрит вправо; левые кадры отражаются
  const creature = (name, frames, pal) => {
    const imgs = (Array.isArray(frames[0]) ? frames : [frames]).map(rows => spriteFrom(rows, pal));
    S[name] = { r: imgs, l: imgs.map(flipped) }; return imgs[0];
  };

  // ---------- Звери ----------
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
  // Костяной прыгун — хищник с костяными пластинами на спине и когтями
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

  // ---------- Городская живность ----------
  creature('pigeon', [['.gg.', 'gggw', '.gg.', '.y..'], ['g..g', 'gggw', '.gg.', '....']], { g: '#7a7a86', w: '#e8e0d0', y: '#c08040' });
  creature('dog', [
    ['.........ee.', 'b........eee', '.bbbbbbbbbe.', '.bbbbbbbbb..', '.b.b...b.b..', '.b.b...b.b..'],
    ['.........ee.', 'b........eee', '.bbbbbbbbbe.', '.bbbbbbbbb..', 'b..b...b..b.', '.b.....b....'],
  ], { b: '#7a5a38', e: '#5a4028' });
  creature('cat', [['.......k.k', 't......kkk', '.t.kkkkkkg', '..kkkkkkk.', '..k.k.k.k.']], { k: '#3a3a40', t: '#3a3a40', g: '#c0e060' });
  creature('chicken', [['...rr.', '..www.', 'wwwwwy', '.www..', '..y...']], { r: '#d03030', w: '#e8e0d0', y: '#e0a030' });

  // ---------- Предметы мира ----------
  S.crystal = spriteFrom(['..l..', '.lcc.', '.lcc.', 'lccdc', '.ccd.', '.cdd.', '..d..'], { c: '#7cf0ff', l: '#e0ffff', d: '#2a8aa8' });
  const rockPal = { r: '#8a8a86', l: '#b4b4ae', d: '#5a5a58' };
  S.rock = spriteFrom(['..lll...', '.llrrr..', 'lrrrrrd.', 'lrrrrrdd', 'rrrrrddd', '.rrdddd.', '..ddd...'], rockPal);
  S.boulder = spriteFrom([
    '....llllll......', '..llllrrrrrr....', '.llrrrrrrrrrrd..', '.lrrrrrrrrrrrdd.', 'lrrrrrrrrrrrrrdd',
    'lrrrrrrrrrrrrrdd', 'lrrrrrrrrrrrrddd', 'rrrrrrrrrrrrrddd', 'rrrrrrrrrrrrdddd', 'rrrrrrrrrrrddddd',
    '.rrrrrrrrrdddddd', '.rrrrrrrdddddddd', '..rrrrdddddddd..', '....dddddddd....'], rockPal);
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
  S.spike = spriteFrom(['Qqqqq'], { q: '#e0d4a8', Q: '#5a4a30' });
  S.lantern = spriteFrom(['.d.', 'dyd', 'dYd', '.d.'], { d: '#3a3a3a', y: '#ffc050', Y: '#fff0a0' });
  S.cart = spriteFrom([
    '..wwwwwwwwww..', '.wwddddddddww.', 'wwddddddddddww', 'wwddddddddddww', '.wwddddddddww.',
    '..wwwwwwwwww..', '.ii........ii.', 'iIIi......iIIi', 'iIIi......iIIi', '.ii........ii.',
  ], { w: '#8a6a3a', d: '#5a4020', i: '#3a2a18', I: '#6a5a40' });
  S.board = spriteFrom([
    'dddddddddddd', 'dwwwwwwwwwwd', 'dwppwwppwwwd', 'dwppwwppwwwd', 'dwwwwwwwwppd',
    'dwppwwwwwppd', 'dwppwwwwwwwd', 'dddddddddddd', '..dd....dd..',
  ], { d: '#4a3220', w: '#6a5030', p: '#e0d8c0' });

  // ---------- Иконки вещей ----------
  S.coin = spriteFrom(['.ooo.', 'oOooo', 'oOooo', 'ooood', '.ddd.'], { o: '#d0a040', O: '#fff0a0', d: '#8a6020' });
  S.bread = spriteFrom(['..bbbb..', '.bBbBbb.', 'bbbbbbbb', 'dbbbbbbd', '.dddddd.'], { b: '#c08040', B: '#e0b070', d: '#7a4a20' });
  S.meatRaw = spriteFrom(['.rrrr..', 'rRrrrr.', 'rrrrrrw', '.rrrrww', '..rr.w.'], { r: '#b83a4a', R: '#e88090', w: '#e8e0d0' });
  S.meatCooked = spriteFrom(['.bbbb..', 'bBbbbb.', 'bbbbbbw', '.bbbbww', '..bb.w.'], { b: '#8a4a20', B: '#c08040', w: '#e8e0d0' });
  S.scroll = spriteFrom(['dpppp.d', '.ppppp.', '.pl.lp.', '.ppppp.', '.p.llp.', '.pppp..', 'd.pppd.'], { p: '#d0c090', l: '#6a5a40', d: '#5a3a20' });
  S.letter = spriteFrom(['wwwwwww', 'wdwwwdw', 'wwdwdww', 'wwwrwww', 'wwwwwww'], { w: '#e0d8c0', d: '#8a7a60', r: '#b02020' });
  S.pendant = spriteFrom(['.ooo.', 'o...o', '.o.o.', '..c..', '.cCc.', '..c..'], { o: '#c0a040', c: '#b070ff', C: '#f0d0ff' });
  S.junkItem = spriteFrom(['..mm...', '.mmmm..', 'mm..mm.', '.mmmm..', '..mmtt.', '....tt.'], { m: '#7a6a5a', t: '#aa5a3a' });
  S.apple = spriteFrom(['..g...', '.rrRr.', 'rrrrRr', 'rrrrrr', '.rrrr.'], { g: '#3a7a2a', r: '#b82a2a', R: '#f08080' });
  S.cloth = spriteFrom(['ppppppl', 'pPpPppl', 'ppppppl', 'pPpPppl', 'dddddd.'], { p: '#8a3a6a', P: '#c070a0', l: '#e0c0e0', d: '#5a2a4a' });
  S.vial = spriteFrom(['.c.', '.g.', 'ggg', 'gGg', 'ggg'], { c: '#6a4a2a', g: '#5aa080', G: '#c0f0e0' });
  S.medicine = spriteFrom(['.dd.', '.cc.', 'aaaa', 'awwa', 'aaaa', 'aaaa'], { d: '#3a2a1a', c: '#8a6a40', a: '#6a3a8a', w: '#e0d0f0' });
  S.salve = spriteFrom(['.ddd.', 'wwwww', 'wgggw', 'wgGgw', '.www.'], { d: '#6a4a2a', w: '#c8c0b0', g: '#6ab08a', G: '#c0f0d0' });
  S.fish = spriteFrom(['.......', '.ssss.t', 'sSesssT', '.ssss.t'], { s: '#8aa0b0', S: '#c8d8e0', e: '#101010', t: '#6a8090', T: '#6a8090' });
  S.candles = spriteFrom(['.f.f.', '.w.w.', 'fw.wf', 'www.w', 'wwwww'], { f: '#ffc040', w: '#e8e0c8' });
  S.nails = spriteFrom(['h.h.h', 'i.i.i', 'i.i.i', 'i.i.i', '.i.i.'], { h: '#9a9aa0', i: '#6a6a70' });
  S.wine = spriteFrom(['.c.', '.g.', 'ggg', 'gRg', 'ggg', 'ggg'], { c: '#6a4a2a', g: '#3a5a3a', R: '#a02040' });
  S.purse = spriteFrom(['.dd.', 'bbbb', 'bBbb', 'bbbb', '.bb.'], { d: '#5a3a1a', b: '#8a5a2a', B: '#c0a040' });
  S.pot = spriteFrom(['.rrr.', 'rRrrr', 'rrrrr', '.rrr.'], { r: '#a05a30', R: '#d08a50' });
  S.sack = spriteFrom(['..sss..', '.sssss.', 'ssssssd', 'ssssssd', 'sssssdd', '.sdddd.'], { s: '#b0a070', d: '#6a5a40' });
  S.iconBolt = spriteFrom(['..yy', '.yy.', 'yyyy', '.yy.', 'yy..'], { y: '#ffd040' });
  S.iconSword = spriteFrom(['......w', '.....wl', '....wl.', '...wl..', 'h.wl...', '.hh....', 'bhh....'], { w: '#e0e4e8', l: '#8a929a', h: '#8a6a3a', b: '#5a3a1a' });
  S.iconArmor = spriteFrom(['.aa.aa.', 'aaaaaaa', 'aAaaaAa', '.aaaaa.', '.aaaaa.', '.aa.aa.'], { a: '#7a5a3a', A: '#b08a5a' });
  S.iconKnives = spriteFrom(['w...w..', '.w...w.', '..w...w', '...h...', '....h..'], { w: '#d8dce0', h: '#6a4a2a' });
  S.iconCloud = spriteFrom(['.ggg..', 'gGgggg', 'gggggg', '.gg.g.'], { g: '#7ac04a', G: '#b8f070' });
  S.iconTask = spriteFrom(['.dddd.', 'dwwwwd', 'dwddwd', 'dwwwwd', 'dwdwwd', '.dddd.'], { d: '#6a5a40', w: '#e0d0a0' });
  S.heart = spriteFrom(['.rr.rr.', 'rRrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#d02040', R: '#ff90a0' });

  // Белые силуэты для вспышки при ударе
  for (const k in S) if (S[k].r) S[k].flash = { r: S[k].r.map(i => silhouette(i, '#fff')), l: S[k].l.map(i => silhouette(i, '#fff')) };
})();
