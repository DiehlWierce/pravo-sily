'use strict';
// Экран, текст, HUD, указатели, диалоги с выбором, вещи и характеристики, смазанный свиток, титульный и финальный экраны.

const screen = document.getElementById('screen');
const dctx = screen.getContext('2d');
const buffer = makeCanvas(W, H);
const bctx = buffer.getContext('2d');
let S = 1;

function resize() {
  const scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  const dpr = window.devicePixelRatio || 1;
  screen.style.width = W * scale + 'px'; screen.style.height = H * scale + 'px';
  screen.width = W * scale * dpr; screen.height = H * scale * dpr;
  S = scale * dpr;
}
addEventListener('resize', resize); resize();

const vignette = (() => {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 220);
  g.addColorStop(0, 'rgba(5,8,12,0)'); g.addColorStop(1, 'rgba(5,8,12,0.7)');
  x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
})();

function font(size) { return `bold ${Math.round(size * S)}px Menlo, Consolas, "DejaVu Sans Mono", monospace`; }
function text(str, x, y, o = {}) {
  const { color = '#f4ecd8', size = 7, align = 'left', shadow = true, alpha = 1 } = o;
  dctx.font = font(size); dctx.textAlign = align; dctx.textBaseline = 'top'; dctx.globalAlpha = alpha;
  if (shadow) { dctx.fillStyle = 'rgba(0,0,0,0.85)'; dctx.fillText(str, x * S + Math.max(1, S * 0.5), y * S + Math.max(1, S * 0.5)); }
  dctx.fillStyle = color; dctx.fillText(str, x * S, y * S); dctx.globalAlpha = 1;
}
function wrap(str, maxW, size) {
  dctx.font = font(size);
  const out = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(' '); let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (dctx.measureText(t.replace(/~/g, '')).width > maxW * S && cur) { out.push(cur); cur = w; } else cur = t;
    }
    out.push(cur);
  }
  return out;
}
function box(x, y, w, h, alpha = 0.9) {
  bctx.fillStyle = `rgba(10,8,14,${alpha})`; bctx.fillRect(x, y, w, h);
  bctx.strokeStyle = '#5a4a60'; bctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

const UI = {
  // ---------- Диалог ----------
  updateDialog(dt) {
    const d = Game.dialog, line = d.lines[d.i], before = Math.floor(d.chars);
    d.chars = Math.min(line.text.length, d.chars + dt * 50);
    if (Math.floor(d.chars) !== before && Math.floor(d.chars) % 3 === 0) Sfx.blip();
    const full = d.chars >= line.text.length;
    if (full && line.choices) {
      if (Input.pressed('up')) { d.sel = (d.sel + line.choices.length - 1) % line.choices.length; Sfx.blip(); }
      if (Input.pressed('down')) { d.sel = (d.sel + 1) % line.choices.length; Sfx.blip(); }
      if (Input.pressed('a')) { const c = line.choices[d.sel]; Game.dialog = null; c.fn && c.fn(); }
      return;
    }
    if (Input.pressed('a') || Input.pressed('start')) {
      if (!full) d.chars = line.text.length;
      else if (++d.i >= d.lines.length) { Game.dialog = null; d.onDone && d.onDone(); }
      else { d.chars = 0; d.sel = 0; }
    }
  },
  dialogShapes() {
    const d = Game.dialog, line = d.lines[d.i], n = line.choices && d.chars >= line.text.length ? line.choices.length : 0;
    box(8, H - 66 - n * 10, W - 16, 58 + n * 10);
  },
  dialogText() {
    const d = Game.dialog, line = d.lines[d.i];
    const n = line.choices && d.chars >= line.text.length ? line.choices.length : 0, top = H - 62 - n * 10;
    if (line.who) text(line.who, 16, top, { size: 6.5, color: line.who === 'Я' ? '#bff8ff' : '#e0b0a0' });
    wrap(line.text.slice(0, Math.floor(d.chars)), W - 36, 7).slice(0, 4).forEach((l, i) => text(l, 16, top + 10 + i * 9, { size: 7, color: line.who ? '#f4ecd8' : '#d8c8a8' }));
    if (n) line.choices.forEach((c, i) => text((i === d.sel ? '▶ ' : '  ') + c.label, 22, top + 50 + i * 10, { size: 7, color: i === d.sel ? '#ffe080' : '#b8b0a0' }));
    else if (d.chars >= line.text.length && Math.floor(Game.time * 3) % 2) text('▼', W - 18, H - 17, { size: 6, color: '#bbb' });
  },

  // ---------- Вещи и характеристики ----------
  invEntries() {
    const p = Game.player, v = p.inv, E = [];
    const add = (icon, name, count, desc, use, key) => E.push({ icon, name, count, desc, use, key });
    if (v.coins) add('coin', 'Медяки', v.coins, 'Хлеб у торговки — 5 медяков. Лекарство у аптекаря — 20.');
    if (v.junk.length) add('junkItem', 'Хлам', v.junk.length, v.junk.join(', ') + '. Скупщик на рынке и некоторые жители берут такое по медяку.');
    const goods = {};
    for (const g of v.goods) (goods[g.name] = goods[g.name] || { ...g, n: 0 }).n++;
    for (const g of Object.values(goods)) add(g.icon, g.name, g.n, `Краденое. Скупщик даст по ${g.value} медяка за штуку.`);
    if (v.bread) add('bread', 'Хлеб', v.bread, 'Для семьи. Отнести домой.');
    if (v.medicine) add('medicine', 'Лекарство', v.medicine, 'Горькая настойка от кашля. Для матери.');
    if (v.meatRaw) add('meatRaw', 'Сырое мясо', v.meatRaw, 'Пожарить на костре.');
    if (v.meatCooked) add('meatCooked', 'Жареное мясо', v.meatCooked, 'Возвращает выносливость и немного здоровья.', () => { v.meatCooked--; p.eat(60, 3, 'Жареное мясо. Силы возвращаются.'); }, 'meatCooked');
    if (v.herbs) add('herb', 'Целебная трава', v.herbs, 'Лечит лёгкие раны.', () => {
      if (p.hp >= p.maxHp) { Game.hint('Раны и так затянуты.', 1.5); return; }
      v.herbs--; p.hp = Math.min(p.maxHp, p.hp + 4); Sfx.pick(); Game.hint('Горько. Раны чуть затянулись.', 1.8);
    }, 'herbs');
    if (v.crystals) add('crystal', 'Кристаллы зверей', v.crystals, 'Тёплые, будто живые. Говорят, их носят дворяне и купцы, а стоят они целое состояние.');
    if (v.scroll) add('scroll', 'Обрывок свитка', 1, 'Потрёпанный, в пятнах крови и копоти. Нашёл в сумке охотника.', () => Story.readScroll(), 'scroll');
    if (v.pendant) add('pendant', 'Блестящая подвеска', 1, 'Тёплая на ощупь. Из-за неё всё и случилось.');
    for (const id of (typeof Quests !== 'undefined' ? Quests.active() : [])) {
      const d = QUEST_DEFS[id];
      add('scroll', d.name, 0, `Заказ гильдии [${d.rank}]. ${d.desc}\nПрогресс: ${Quests.progress(id)}/${d.need}. Награда: ${d.coins} медяков.`);
    }
    E.push({ name: 'Продолжить игру', desc: 'Закрыть вещи и вернуться в игру.', sys: 'resume' });
    E.push({ name: 'Начать игру', desc: 'Начать заново с самого начала. Текущее сохранение будет стёрто.', sys: 'newgame' });
    return E;
  },
  updateMenu() {
    const m = Game.menu, E = this.invEntries();
    if (Input.pressed('start') || Input.pressed('b')) { Game.menu = null; return; }
    if (!E.length) return;
    m.sel = clamp(m.sel, 0, E.length - 1);
    if (Input.pressed('up')) { m.sel = (m.sel + E.length - 1) % E.length; Sfx.blip(); }
    if (Input.pressed('down')) { m.sel = (m.sel + 1) % E.length; Sfx.blip(); }
    const sel = E[m.sel];
    if (Input.pressed('a') && sel.sys) {
      Game.menu = null;
      if (sel.sys === 'newgame') Game.choose('', 'Начать заново? Текущее сохранение будет стёрто.', [
        { label: 'Да, начать заново', fn: () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } Game.newGame(); } },
        { label: 'Нет', fn: () => { } },
      ]);
      return;
    }
    if (Input.pressed('a') && sel.use) { sel.use(); if (Game.reader || Game.dialog) Game.menu = null; }
    if (Input.pressed('x')) {
      const k = E[m.sel].key;
      if (!k) Game.hint('Этот предмет нельзя повесить на быструю кнопку.', 2);
      else { Game.player.quickItem = Game.player.quickItem === k ? null : k; Sfx.pick(); }
    }
    if (Input.pressed('l')) { Game.toTitle(); }
  },
  menuShapes() {
    box(14, 12, W - 28, H - 24, 0.95);
    const p = Game.player, E = this.invEntries(), m = Game.menu;
    bctx.fillStyle = '#000a'; bctx.fillRect(22, 44, 110, 3);
    bctx.fillStyle = '#c8b0ff'; bctx.fillRect(22, 44, Math.round(110 * p.xp / p.xpNext()), 3);
    for (let i = 0; i < E.length; i++) {
      const e = E[i], y = 62 + i * 13;
      if (i === m.sel) { bctx.fillStyle = 'rgba(255,224,128,0.12)'; bctx.fillRect(20, y - 5, 156, 12); }
      if (!e.icon) continue;
      const img = Art.spr[e.icon]; drawSpr(bctx, img, 29 - img.width / 2, y + 1 - img.height / 2);
    }
  },
  menuText() {
    const p = Game.player, E = this.invEntries(), m = Game.menu;
    text(`Ур. ${p.level}`, 22, 18, { size: 9, color: '#bff8ff' });
    text(`опыт ${p.xp}/${p.xpNext()}`, 70, 21, { size: 6, color: '#c8b0ff' });
    text(`Сила ${p.stats.str} · Здоровье ${p.stats.hp} · Выносл. ${p.stats.sta}`, 22, 31, { size: 6, color: '#e8e0d0' });
    if (!E.length) text('Пусто. Только нож.', 26, 58, { size: 7, color: '#aaa' });
    E.forEach((e, i) => {
      text(e.name, 38, 58 + i * 13, { size: 6.5, color: i === m.sel ? '#ffe080' : e.sys ? '#9ad8ff' : '#e8e0d0' });
      if (e.count) text('×' + e.count, 172, 58 + i * 13, { size: 6.5, align: 'right', color: '#aaa' });
    });
    const sel = E[clamp(m.sel, 0, E.length - 1)];
    if (sel) {
      wrap(sel.desc, 112, 6).slice(0, 8).forEach((l, i) => text(l, 186, 58 + i * 9, { size: 6, color: '#d8d0c0' }));
      if (sel.use) text('Space — использовать', 186, 130, { size: 6, color: '#ffe080' });
      if (sel.key) text(p.quickItem === sel.key ? 'J — снять с кнопки E' : 'J — повесить на кнопку E', 186, 139, { size: 6, color: '#9ad' });
    }
    this.controls(186, 156, 5.2);
    text('Enter / Shift — закрыть · Q — выйти в главное меню', W / 2, H - 22, { size: 6, align: 'center', color: '#889' });
  },
  controls(x, y, size) {
    [['WASD', 'идти'], ['Space', 'действие'], ['Shift', 'рывок'], ['J', 'нож'], ['E', 'съесть'], ['Enter', 'вещи']]
      .forEach(([k, v], i) => { text(k, x, y + i * 8, { size, color: '#ffe080' }); text(v, x + 34, y + i * 8, { size, color: '#b8b0a0' }); });
  },

  // ---------- Смазанный свиток ----------
  updateReader() {
    const r = Game.reader;
    if (Input.pressed('a') || Input.pressed('start') || Input.pressed('right')) {
      Sfx.blip();
      if (++r.page >= r.pages.length) { Game.reader = null; r.onClose && r.onClose(); }
    } else if ((Input.pressed('left') || Input.pressed('b')) && r.page > 0) r.page--;
  },
  readerShapes() {
    bctx.fillStyle = 'rgba(0,0,0,0.65)'; bctx.fillRect(0, 0, W, H);
    const R = mulberry32(99 + Game.reader.page * 7);
    bctx.fillStyle = '#cbb88e'; bctx.fillRect(40, 16, W - 80, H - 32);
    // Рваные края, пятна крови и копоти
    bctx.fillStyle = 'rgba(0,0,0,0.65)';
    for (let y = 16; y < H - 16; y += 3) { bctx.fillRect(40, y, (R() * 5) | 0, 3); bctx.fillRect(W - 40 - ((R() * 6) | 0), y, 6, 3); }
    for (let x = 40; x < W - 40; x += 3) bctx.fillRect(x, H - 16 - ((R() * 8) | 0), 3, 8);
    for (let i = 0; i < 7; i++) {
      bctx.fillStyle = i < 2 ? 'rgba(110,30,20,0.35)' : 'rgba(60,40,20,0.22)';
      bctx.beginPath(); bctx.ellipse(50 + R() * (W - 100), 30 + R() * (H - 70), 6 + R() * 16, 4 + R() * 10, R() * 3, 0, 7); bctx.fill();
    }
  },
  readerText() {
    const r = Game.reader, R = mulberry32(7 + r.page);
    const lines = wrap(r.pages[r.page], W - 108, 6.5).slice(0, 18);
    lines.forEach((line, li) => {
      let x = 52;
      dctx.font = font(6.5);
      for (const word of line.split(' ')) {
        const faded = word.includes('~'), clean = word.replace(/~/g, '');
        const w = dctx.measureText(clean + ' ').width / S;
        if (/^█+[.,…]*$/.test(clean)) { dctx.fillStyle = 'rgba(40,24,12,0.8)'; dctx.fillRect(x * S, (30 + li * 9) * S, (w - 2) * S, 6 * S); }
        else text(clean, x, 30 + li * 9, { size: 6.5, color: '#2a1a0a', shadow: false, alpha: faded ? 0.28 + R() * 0.15 : 0.85 + R() * 0.15 });
        x += w;
      }
    });
    text(`${r.page + 1}/${r.pages.length}`, W / 2, H - 28, { size: 6, align: 'center', color: '#5a4020', shadow: false });
  },

  // ---------- HUD ----------
  hudShapes() {
    const p = Game.player, s = Art.spr;
    // Полоски: сердце — здоровье, молния — выносливость, кристалл — энергия, облако — отравление
    const bar = (y, icon, v, max, col, mark) => {
      const img = s[icon];
      drawSpr(bctx, img, 4, y + 2 - Math.floor(img.height / 2));
      bctx.fillStyle = '#000a'; bctx.fillRect(14, y - 1, 56, 6);
      bctx.fillStyle = '#1a1420'; bctx.fillRect(15, y, 54, 4);
      bctx.fillStyle = col; bctx.fillRect(15, y, Math.round(54 * clamp(v / max, 0, 1)), 4);
      if (mark) { bctx.fillStyle = '#fff8'; bctx.fillRect(42, y - 1, 1, 6); }
    };
    bar(5, 'heart', p.hp, p.maxHp, p.hp < p.maxHp * 0.3 ? '#ff4040' : '#d02040');
    bar(13, 'iconBolt', p.stamina, p.maxStamina, p.stamina < p.maxStamina * 0.25 ? '#ff8040' : '#ffd040');
    if (p.implant) { bar(21, 'crystal', p.implant.energy, 100, '#7cf0ff'); bar(29, 'iconCloud', p.implant.toxin, 100, p.implant.toxin >= 50 ? '#b0ff50' : '#6aa040', true); }
    // Быстрая кнопка
    const q = p.quickItem && UI.invEntries().find(x => x.key === p.quickItem);
    bctx.fillStyle = '#000a'; bctx.fillRect(4, H - 22, 18, 18);
    bctx.strokeStyle = q ? '#ffe080' : '#5a4a60'; bctx.strokeRect(4.5, H - 21.5, 17, 17);
    if (q) drawSpr(bctx, s[q.icon], 13 - s[q.icon].width / 2, H - 13 - s[q.icon].height / 2);
    let rx = W - 40;
    if (p.inv.coins || World.theme === 'slums') { drawSpr(bctx, s.coin, rx - 10, 5); rx -= 26; }
    if (p.inv.crystals) { drawSpr(bctx, s.crystal, rx - 10, 4); rx -= 26; }
    if (Game.hintT > 0 && Game.hintText && !Game.dialog && !Game.menu && !Game.reader) box(10, H - 44, W - 20, 22, 0.72);
    const pr = Game.prompt;
    if (pr && !Game.dialog && !Game.menu && !Game.reader && pr.progress > 0) {
      const sx = Math.round(pr.x - Game.cam.x), sy = Math.round(pr.y - Game.cam.y);
      bctx.strokeStyle = '#7cf0ff'; bctx.beginPath(); bctx.arc(sx, sy - 6, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(pr.progress, 0, 1)); bctx.stroke();
    }
    const b = Game.bossBar;
    if (b && b.alive) { bctx.fillStyle = '#000b'; bctx.fillRect(100, H - 12, 120, 6); bctx.fillStyle = '#a02838'; bctx.fillRect(101, H - 11, Math.round(118 * b.hp / b.maxHp), 4); }
    this.waypointShapes();
  },
  waypointShapes() {
    const wp = Game.waypoint; Game._wp = null;
    if (!wp || Game.dialog) return;
    const sx = wp.x - Game.cam.x, sy = wp.y - Game.cam.y, pulse = 0.6 + 0.4 * Math.sin(Game.time * 6);
    bctx.fillStyle = `rgba(255,210,90,${pulse})`;
    if (sx > 14 && sx < W - 14 && sy > 30 && sy < H - 40) {
      const y = sy - 22 + Math.sin(Game.time * 5) * 2;
      bctx.beginPath(); bctx.moveTo(sx - 4, y); bctx.lineTo(sx + 4, y); bctx.lineTo(sx, y + 6); bctx.fill();
      Game._wp = { x: sx, y: y - 9, label: wp.label };
      return;
    }
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    const cx = clamp(sx, 14, W - 14), cy = clamp(sy, 36, H - 50);
    bctx.save(); bctx.translate(Math.round(cx), Math.round(cy)); bctx.rotate(a);
    bctx.beginPath(); bctx.moveTo(8, 0); bctx.lineTo(-4, -6); bctx.lineTo(-1, 0); bctx.lineTo(-4, 6); bctx.fill();
    bctx.restore();
    Game._wp = { x: clamp(cx - Math.cos(a) * 16, 30, W - 30), y: cy - Math.sin(a) * 12 - 3, label: wp.label };
  },
  hudText() {
    const p = Game.player;
    const q = p.quickItem && UI.invEntries().find(x => x.key === p.quickItem);
    text('E', 6, H - 21, { size: 5, color: q ? '#ffe080' : '#7a6a80' });
    if (q && q.count > 1) text('×' + q.count, 21, H - 12, { size: 5, align: 'right', color: '#e8e0d0' });
    text(`Ур.${p.level}`, W - 4, 4, { size: 6.5, align: 'right', color: '#c8b0ff' });
    let rx = W - 40;
    if (p.inv.coins || World.theme === 'slums') { text(String(p.inv.coins), rx + 1, 4, { size: 6.5, color: '#ffe080' }); rx -= 26; }
    if (p.inv.crystals) { text(String(p.inv.crystals), rx + 1, 4, { size: 6.5, color: '#bff8ff' }); rx -= 26; }
    if (Game.objective && !Game.dialog && !Game.menu) text('▸ ' + Game.objective, W - 4, 15, { size: 5.5, align: 'right', color: '#e8d8a8' });
    if (Game.menu || Game.reader) return;
    for (const l of Game.labels) text(l.text, l.x - Game.cam.x, l.y - Game.cam.y, { size: 4.5, align: 'center', color: l.color });
    for (const f of Game.floaters) text(f.text, f.x - Game.cam.x, f.y - Game.cam.y, { size: 5.5, align: 'center', color: f.color, alpha: clamp(f.ttl, 0, 1) });
    if (Game.bossBar && Game.bossBar.alive) text(Game.bossBar.name, W / 2, H - 21, { size: 5.5, align: 'center', color: '#e0b0c0' });
    if (Game._wp && Game._wp.label) text(Game._wp.label, Game._wp.x, Game._wp.y, { size: 5, align: 'center', color: '#ffe0a0' });
    if (Game.hintT > 0 && Game.hintText && !Game.dialog && !Game.menu && !Game.reader) {
      const lines = wrap(Game.hintText, W - 32, 6);
      lines.slice(0, 2).forEach((l, i) => text(l, W / 2, H - 42 + i * 9 + (lines.length === 1 ? 4 : 0), { size: 6, align: 'center', color: '#fff' }));
    }
    const pr = Game.prompt;
    if (pr && !Game.dialog && !Game.menu && !Game.reader) text(pr.label, pr.x - Game.cam.x, pr.y - Game.cam.y - 2, { size: 5.5, align: 'center', color: '#fff' });
    if (Game.banner) {
      const bn = Game.banner, a = clamp(Math.min(bn.t, bn.max - bn.t) * 2, 0, 1);
      text(bn.title, W / 2, 78, { size: 15, align: 'center', color: bn.color || '#bff8ff', alpha: a });
      if (bn.sub) text(bn.sub, W / 2, 98, { size: 7, align: 'center', color: '#9ad', alpha: a });
    }
  },

  // ---------- Титульный и финальный экраны ----------
  titleOptions() { return Game.hasSave() ? ['Продолжить', 'Новая игра'] : ['Новая игра']; },
  updateTitle() {
    const o = this.titleOptions(); Game.titleSel = clamp(Game.titleSel || 0, 0, o.length - 1);
    if (Input.pressed('up') || Input.pressed('down')) { Game.titleSel = (Game.titleSel + 1) % o.length; Sfx.blip(); }
    if (Input.pressed('a') || Input.pressed('start')) { o[Game.titleSel] === 'Продолжить' ? Game.loadGame() : Game.newGame(); }
  },
  titleShapes() {
    bctx.fillStyle = '#0b0a0f'; bctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      const x = i * 24 - 6, h = 30 + ((i * 37) % 60);
      bctx.fillStyle = '#16121a'; bctx.fillRect(x, 190 - h, 22, h);
      if ((i * 13) % 3 === 0) { bctx.fillStyle = `rgba(255,190,90,${0.4 + 0.2 * Math.sin(Game.time * 3 + i)})`; bctx.fillRect(x + 8, 190 - h + 8, 3, 4); }
    }
    bctx.fillStyle = '#0e0c12'; bctx.fillRect(0, 190, W, 50);
  },
  titleText() {
    text('ПРАВО СИЛЫ', W / 2, 40, { size: 22, align: 'center', color: '#bff8ff' });
    text('Главы 0–1 · Крысёныш', W / 2, 66, { size: 7, align: 'center', color: '#a8b8c0' });
    this.titleOptions().forEach((o, i) => text((i === Game.titleSel ? '▶ ' : '  ') + o, W / 2 - 30, 106 + i * 14, { size: 8, color: i === Game.titleSel ? '#ffe080' : '#b8b0a0' }));
    this.controls(118, 150, 5.5);
  },
  endText() {
    dctx.fillStyle = 'rgba(5,6,10,0.85)'; dctx.fillRect(0, 0, screen.width, screen.height);
    const s = Game.stats, p = Game.player, m = Math.floor(s.time / 60), sec = String(Math.floor(s.time % 60)).padStart(2, '0');
    text('КОНЕЦ ГЛАВЫ 1', W / 2, 26, { size: 15, align: 'center', color: '#bff8ff' });
    text('Хижина в Чёрном лесу · прогресс сохранён', W / 2, 46, { size: 6, align: 'center', color: '#9ad' });
    const rows = [['Время', `${m}:${sec}`], ['Уровень', `${p.level} (Сила ${p.stats.str} · Здоровье ${p.stats.hp} · Выносл. ${p.stats.sta})`],
      ['Зверей убито', s.kills], ['Кристаллов добыто', s.crystals], ['Краж', s.steals], ['Смертей', s.deaths]];
    rows.forEach(([k, v], i) => { text(k, 130, 70 + i * 13, { size: 6.5, align: 'right', color: '#d8d0c0' }); text(String(v), 140, 70 + i * 13, { size: 6.5, color: '#ffe080' }); });
    text('Дальше — Глава 2: дорога в город и гильдия', W / 2, 170, { size: 6, align: 'center', color: '#a8b8c0' });
    if (Math.floor(Game.time * 2) % 2) text('Enter — в меню', W / 2, 200, { size: 7, align: 'center', color: '#ffe080' });
  },
};
