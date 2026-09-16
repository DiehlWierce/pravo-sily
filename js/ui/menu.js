'use strict';
// Меню вещей и характеристик (Enter): предметы, снаряжение, заказы, поручения, пункты игры.

Object.assign(UI, {
  invEntries() {
    const p = Game.player, E = [];
    const add = (icon, name, count, desc, key) => E.push({ icon, name, count, desc, key, use: key && ITEMS[key] && ITEMS[key].use ? () => Inv.use(key) : null });
    for (const id in ITEMS) {
      const n = Inv.count(id);
      if (!n) continue;
      add(ITEMS[id].icon, ITEMS[id].name, n, Inv.desc(id), ITEMS[id].use ? id : null);
    }
    if (p.hasKnife) add('iconSword', p.weapon.name, 1, `Оружие. Урон ${p.damage}. ${p.weapon.desc}`);
    if (p.gear.armor !== 'rags') add('iconArmor', p.armor.name, 1, `Одежда. ${p.armor.desc}`);
    for (const id of Quests.active()) {
      const d = QUEST_DEFS[id];
      add('scroll', d.name, 0, `Заказ [${d.rank}]. ${d.desc}\nПрогресс: ${Quests.progress(id)}/${Quests.needOf(id)}. Награда: ${d.coins} медяков.`);
    }
    for (const id of Errands.active()) {
      const d = ERRANDS[id], who = (PERSONAS[d.giver] || {}).name || '';
      add('iconTask', d.name, 0, `Поручение: ${who}.\n${Errands.line(id)}. Награда: ${d.reward.coins} медяков и ${d.reward.xp} опыта.`);
    }
    E.push({ name: 'Продолжить игру', desc: 'Закрыть вещи и вернуться в игру.', sys: 'resume' });
    E.push({ name: 'Начать игру', desc: 'Начать заново с самого начала. Текущее сохранение будет стёрто.', sys: 'newgame' });
    return E;
  },
  updateMenu() {
    const m = Game.menu, E = this.invEntries();
    if (Input.pressed('start') || Input.pressed('b')) { Game.menu = null; return; }
    m.sel = clamp(m.sel, 0, E.length - 1);
    if (Input.pressed('up')) { m.sel = (m.sel + E.length - 1) % E.length; Sfx.blip(); }
    if (Input.pressed('down')) { m.sel = (m.sel + 1) % E.length; Sfx.blip(); }
    const sel = E[m.sel];
    if (Input.pressed('a') && sel.sys) {
      Game.menu = null;
      if (sel.sys === 'newgame') Game.choose('', 'Начать заново? Текущее сохранение будет стёрто.', [
        { label: 'Да, начать заново', fn: () => { Save.clear(); Game.newGame(); } },
        { label: 'Нет', fn: () => { } },
      ]);
      return;
    }
    if (Input.pressed('a') && sel.use) { sel.use(); if (Game.reader || Game.dialog) Game.menu = null; }
    if (Input.pressed('x')) {
      if (!sel.key) Game.hint('Этот предмет нельзя повесить на быструю кнопку.', 2);
      else { Game.player.quickItem = Game.player.quickItem === sel.key ? null : sel.key; Sfx.pick(); }
    }
    if (Input.pressed('l')) Game.toTitle();
  },
  menuWindow(E, m) { const top = clamp(m.sel - 6, 0, Math.max(0, E.length - 12)); return { top, rows: E.slice(top, top + 12) }; },
  menuShapes() {
    box(14, 12, W - 28, H - 24, 0.95);
    const p = Game.player, all = this.invEntries(), m = Game.menu, win = this.menuWindow(all, m), E = win.rows;
    bctx.fillStyle = '#000a'; bctx.fillRect(22, 44, 110, 3);
    bctx.fillStyle = '#c8b0ff'; bctx.fillRect(22, 44, Math.round(110 * p.xp / p.xpNext()), 3);
    for (let i = 0; i < E.length; i++) {
      const e = E[i], y = 62 + i * 13;
      if (i + win.top === m.sel) { bctx.fillStyle = 'rgba(255,224,128,0.12)'; bctx.fillRect(20, y - 5, 156, 12); }
      const img = e.icon && Art.spr[e.icon];
      if (img) drawSpr(bctx, img, 29 - img.width / 2, y + 1 - img.height / 2);
    }
  },
  menuText() {
    const p = Game.player, all = this.invEntries(), m = Game.menu, win = this.menuWindow(all, m), E = win.rows;
    text(`Ур. ${p.level}`, 22, 18, { size: 9, color: '#bff8ff' });
    text(`опыт ${p.xp}/${p.xpNext()}`, 70, 21, { size: 6, color: '#c8b0ff' });
    text(`Сила ${p.stats.str} · Здоровье ${p.stats.hp} · Выносл. ${p.stats.sta}`, 22, 31, { size: 6, color: '#e8e0d0' });
    if (Game.flags.guildMember) text(`Ранг ${Quests.rank()} · репутация ${Quests.rep()}`, W - 24, 21, { size: 6, align: 'right', color: '#ffe080' });
    if (win.top > 0) text('▲', 100, 50, { size: 5, color: '#889' });
    if (win.top + 12 < all.length) text('▼', 100, 58 + 12 * 13 - 4, { size: 5, color: '#889' });
    E.forEach((e, i) => {
      text(e.name, 38, 58 + i * 13, { size: 6.5, color: i + win.top === m.sel ? '#ffe080' : e.sys ? '#9ad8ff' : '#e8e0d0' });
      if (e.count) text('×' + e.count, 172, 58 + i * 13, { size: 6.5, align: 'right', color: '#aaa' });
    });
    const sel = all[clamp(m.sel, 0, all.length - 1)];
    if (sel) {
      wrap(sel.desc, 112, 6).slice(0, 8).forEach((l, i) => text(l, 186, 58 + i * 9, { size: 6, color: '#d8d0c0' }));
      if (sel.use) text('Space — использовать', 186, 130, { size: 6, color: '#ffe080' });
      if (sel.key) text(p.quickItem === sel.key ? 'J — снять с кнопки E' : 'J — повесить на кнопку E', 186, 139, { size: 6, color: '#9ad' });
    }
    this.controls(186, 156, 5.2);
    text('Enter / Shift — закрыть · Q — выйти в главное меню', W / 2, H - 22, { size: 6, align: 'center', color: '#889' });
  },
  controls(x, y, size) {
    [['WASD', 'идти'], ['Space', 'действие'], ['Shift', 'рывок'], ['J', 'удар'], ['K', 'нож'], ['E', 'быстрая'], ['Enter', 'вещи']]
      .forEach(([k, v], i) => { text(k, x, y + i * 8, { size, color: '#ffe080' }); text(v, x + 34, y + i * 8, { size, color: '#b8b0a0' }); });
  },
});
