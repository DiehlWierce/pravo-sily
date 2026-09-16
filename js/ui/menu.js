'use strict';
// Игровое меню (Enter): слева разделы, справа содержимое выбранного раздела.
// Каждый раздел — функция, которая возвращает строки. Строка:
//   { label, value, icon, color, header, desc, a(), x(), left(), right() }
//   header — заголовок группы (курсор его пропускает); a — Space; x — J; left/right — стрелки внутри раздела.
// Чтобы добавить раздел — допишите объект в MENU_SECTIONS.

const MENU_SECTIONS = [
  { id: 'inventory', name: 'Вещи' },
  { id: 'equipment', name: 'Снаряжение' },
  { id: 'character', name: 'Персонаж', wide: true },
  { id: 'quests', name: 'Задания' },
  { id: 'bestiary', name: 'Бестиарий' },
  { id: 'settings', name: 'Настройки', wide: true },
  { id: 'controls', name: 'Управление', wide: true },
  { id: 'resume', name: 'Продолжить', action: true },
  { id: 'title', name: 'В главное меню', action: true },
  { id: 'newgame', name: 'Начать заново', action: true },
];

const CONTROLS = [
  ['WASD / стрелки', 'Идти', 'крестовина'],
  ['Space', 'Действие · удерживать — обыскать, стащить', 'A'],
  ['Shift', 'Рывок', 'B'],
  ['J', 'Удар', 'X'],
  ['K', 'Метательный нож', 'Y'],
  ['E', 'Быстрая кнопка', 'R'],
  ['Enter / Esc', 'Меню', 'Start'],
  ['Q / E в меню', 'Соседний раздел', 'L / R'],
];

const MenuSections = {
  inventory(m) {
    const cat = ITEM_CATS[m.cat || 0], p = Game.player;
    const ids = Object.keys(ITEMS).filter(id => !ITEMS_NOT_LISTED.includes(id) && Inv.count(id) && (!cat.items || cat.items.includes(id)));
    const rows = ids.map(id => {
      const def = ITEMS[id], quick = p.quickItem === id;
      return {
        label: def.name, icon: def.icon, value: `×${Inv.count(id)}${quick ? ' ·E' : ''}`,
        desc: Inv.desc(id) + (def.use ? '\n\nSpace — использовать.\nJ — ' + (quick ? 'снять с кнопки E.' : 'повесить на кнопку E.') : ''),
        a: def.use ? () => { Inv.use(id); if (Game.dialog || Game.reader) Game.menu = null; } : null,
        x: def.use ? () => { p.quickItem = quick ? null : id; Sfx.pick(); } : () => Game.hint('Этот предмет нельзя повесить на быструю кнопку.', 2),
      };
    });
    if (!rows.length) rows.push({ label: 'Пусто', color: '#8a8290', desc: cat.items ? 'В этом разделе ничего нет.' : 'Сумка пуста.' });
    const step = dir => { m.cat = ((m.cat || 0) + dir + ITEM_CATS.length) % ITEM_CATS.length; m.sel = 0; Sfx.blip(); };
    rows.forEach(r => { r.left = () => step(-1); r.right = () => step(1); });
    return { rows, tabs: ITEM_CATS.map(c => c.name), tab: m.cat || 0 };
  },

  equipment() {
    const p = Game.player, knives = Inv.count('knives'), q = p.quickItem && ITEMS[p.quickItem];
    return { rows: [
      { header: true, label: 'Оружие' },
      p.hasKnife
        ? { label: p.weapon.name, icon: 'iconSword', value: `урон ${p.damage}`, desc: `${p.weapon.desc}\n\nУрон ${p.damage}: оружие ${p.weapon.dmg} и сила. Дальность удара ${p.weapon.reach}.\nНовое оружие — у оружейника в городе, по рангу гильдии.` }
        : { label: 'Нет оружия', color: '#8a8290', desc: 'Бить нечем. Нож появится по сюжету.' },
      { label: 'Метательные ножи', icon: 'iconKnives', value: `×${knives}`, desc: ITEMS.knives.desc + '\n\nПокупаются у оружейника по 5 штук.' },
      { header: true, label: 'Одежда' },
      { label: p.armor.name, icon: 'iconArmor', value: p.armor.def ? `защита ${p.armor.def}` : '—', desc: p.armor.desc + (p.armor.slow ? '\n\nЗамедляет бег.' : '') },
      { header: true, label: 'Быстрая кнопка E' },
      { label: q ? q.name : 'Пусто', icon: q ? q.icon : null, value: q ? `×${Inv.count(p.quickItem)}` : '', color: q ? null : '#8a8290',
        desc: 'Что назначено на кнопку E. Назначить: раздел «Вещи», выбрать предмет и нажать J.' },
    ] };
  },

  character() {
    const p = Game.player, s = Game.stats, F = Game.flags;
    const time = `${Math.floor(s.time / 3600)}:${String(Math.floor(s.time / 60) % 60).padStart(2, '0')}`;
    const rows = [
      { header: true, label: 'Герой' },
      { label: 'Уровень', value: `${p.level}`, desc: 'Опыт даётся за зверей, заказы и поручения. Каждый уровень повышает одну характеристику по кругу: сила → здоровье → выносливость.' },
      { label: 'Опыт', value: `${p.xp} / ${p.xpNext()}`, bar: p.xp / p.xpNext(), desc: 'Сколько опыта до следующего уровня.' },
      { label: 'Сила', value: `${p.stats.str}`, desc: 'Урон оружием и метательными ножами.' },
      { label: 'Здоровье', value: `${Math.ceil(p.hp)} / ${p.maxHp}`, bar: p.hp / p.maxHp, desc: 'Ноль — смерть и загрузка последнего сохранения. Восстанавливается у костра, едой, травами и мазями.' },
      { label: 'Выносливость', value: `${Math.round(p.stamina)} / ${p.maxStamina}`, bar: p.stamina / p.maxStamina, desc: 'Тратится на рывок, удар и бросок ножа. Восстанавливается сама.' },
      { label: 'Урон · защита', value: `${p.damage} · ${p.armor.def}`, desc: 'Урон оружием и насколько одежда ослабляет удар зверя.' },
    ];
    if (F.guildMember) rows.push({ header: true, label: 'Гильдия' },
      { label: 'Ранг', value: Quests.rank(), desc: 'Ранг открывает заказы, снаряжение и новые угодья: Дальняя роща с F-, Гнилые болота с E-.' },
      { label: 'Репутация', value: `${Quests.rep()}` + (Quests.nextRankRep() !== null ? ` / ${Quests.nextRankRep()}` : ''), desc: 'Растёт за сданные заказы гильдии.' });
    rows.push({ header: true, label: 'Путь' },
      { label: 'Время в игре', value: time, desc: 'Часы и минуты.' },
      { label: 'Зверей повержено', value: `${s.kills}`, desc: 'Все, кого одолел герой.' },
      { label: 'Кристаллов добыто', value: `${s.crystals}`, desc: 'Вырезано из зверей силы.' },
      { label: 'Краж · поймали', value: `${s.steals} · ${s.caught || 0}`, desc: 'Удачные кражи и сколько раз получил леща.' },
      { label: 'Смертей', value: `${s.deaths}`, desc: 'Каждая смерть возвращает к последнему сохранению.' });
    return { rows };
  },

  quests() {
    const F = Game.flags, rows = [];
    rows.push({ header: true, label: 'Сюжет' });
    rows.push({ label: CHAPTER_NAMES[F.chapter] || 'Сюжет', icon: 'iconTask', color: '#ffe080',
      desc: Game.objective ? `Цель: ${Game.objective}` : 'Сейчас сюжет не требует ничего срочного.' });
    const guild = Quests.active();
    if (F.guildMember || guild.length) {
      rows.push({ header: true, label: `Заказы (${guild.length}/3)` });
      for (const id of guild) {
        const d = QUEST_DEFS[id], ready = Quests.ready(id);
        rows.push({ label: d.name, icon: 'scroll', value: ready ? 'готово' : `${Quests.progress(id)}/${Quests.needOf(id)}`, color: ready ? '#a0e080' : null,
          desc: `[${d.rank}] ${d.desc}\n\nНаграда: ${d.coins} медяков, репутация +${d.rep}, опыт ${d.xp}.\nСдать: ${d.giver === 'guild' ? 'клерку гильдии' : 'Мирону на хуторе'}.` });
      }
      if (!guild.length) rows.push({ label: 'Нет взятых заказов', color: '#8a8290', desc: 'Заказы берутся на доске в гильдии, до трёх разом.' });
    }
    const errands = Errands.active();
    if (errands.length) {
      rows.push({ header: true, label: 'Поручения' });
      for (const id of errands) {
        const d = ERRANDS[id], ready = !d.deliver && Errands.ready(id);
        rows.push({ label: d.name, icon: 'iconTask', value: ready ? 'готово' : '', color: ready ? '#a0e080' : null,
          desc: `${d.offer}\n\n${Errands.line(id)}.\nНаграда: ${d.reward.coins} медяков и ${d.reward.xp} опыта.` });
      }
    }
    const doneErrands = Object.keys(ERRANDS).filter(id => Errands.state(id).done);
    const doneSpecial = Object.keys(QUEST_DEFS).filter(id => !QUEST_DEFS[id].repeat && Quests.done(id));
    if (doneErrands.length || doneSpecial.length || Quests.totalDone()) {
      rows.push({ header: true, label: 'Выполнено' });
      if (Quests.totalDone()) rows.push({ label: 'Заказов сдано', value: `${Quests.totalDone()}`, color: '#8a8290', desc: 'Все заказы гильдии и хутора, включая повторяемые.' });
      for (const id of doneSpecial) rows.push({ label: QUEST_DEFS[id].name, value: '✓', color: '#8a8290', desc: QUEST_DEFS[id].desc });
      for (const id of doneErrands) rows.push({ label: ERRANDS[id].name, value: '✓', color: '#8a8290', desc: ERRANDS[id].thanks });
    }
    return { rows };
  },

  bestiary() {
    const B = Game.flags.bestiary || {};
    const rows = Object.keys(BEAST_NOTES).map(kind => {
      const b = B[kind], base = BEASTS[kind];
      if (!b) return { label: '???', color: '#6a6270', desc: 'Ещё не встречал.' };
      return { label: base.name, value: b.kills ? `повержено ${b.kills}` : 'видел', color: base.force ? '#d8b8ff' : null,
        desc: `${base.force ? 'Зверь силы. ' : ''}${BEAST_NOTES[kind]}\n\nНа первом уровне: здоровье ${base.hp}${base.dmg ? `, урон ${base.dmg}` : ''}.` };
    });
    return { rows };
  },

  settings() {
    return { rows: Settings.DEFS.map(d => ({
      label: d.name, value: Settings.valueText(d), desc: d.desc + (d.type === 'action' ? '\n\nSpace — переключить.' : '\n\n← → — изменить.'),
      a: () => Settings.change(d, 0), left: () => Settings.change(d, -1), right: () => Settings.change(d, 1),
    })) };
  },

  controls() {
    return { rows: [
      { header: true, label: 'Клавиатура · геймпад' },
      ...CONTROLS.map(([key, action, pad]) => ({ label: action, value: `${key} · ${pad}`, desc: `${action}.\nКлавиатура: ${key}. Геймпад: ${pad}.` })),
    ] };
  },
};

Object.assign(UI, {
  openMenu(only) {
    const sec = only ? MENU_SECTIONS.findIndex(s => s.id === only) : 0;
    Game.menu = { sec, sel: 0, cat: 0, focus: only ? 'content' : 'side', only };
    Sfx.blip();
  },
  menuContent(m) {
    const s = MENU_SECTIONS[m.sec];
    if (s.action || !MenuSections[s.id]) return { rows: [] };
    const c = MenuSections[s.id](m);
    return c;
  },
  // Курсор: пропускает заголовки групп
  moveSel(rows, sel, dir) {
    if (!rows.some(r => !r.header)) return 0;
    let i = sel;
    do { i = (i + dir + rows.length) % rows.length; } while (rows[i].header);
    return i;
  },
  firstSel(rows) { const i = rows.findIndex(r => !r.header); return Math.max(0, i); },

  updateMenu() {
    const m = Game.menu, sec = MENU_SECTIONS[m.sec];
    if (Input.pressed('start')) { Game.menu = null; return; }

    if (m.focus === 'side') {
      if (Input.pressed('b')) { Game.menu = null; return; }
      if (Input.pressed('up')) { m.sec = (m.sec + MENU_SECTIONS.length - 1) % MENU_SECTIONS.length; Sfx.blip(); }
      if (Input.pressed('down')) { m.sec = (m.sec + 1) % MENU_SECTIONS.length; Sfx.blip(); }
      if (Input.pressed('a') || Input.pressed('right')) {
        const s = MENU_SECTIONS[m.sec];
        if (s.action) return this.menuAction(s.id);
        m.focus = 'content'; m.sel = this.firstSel(this.menuContent(m).rows); Sfx.blip();
      }
      return;
    }

    const { rows } = this.menuContent(m);
    if (m.sel >= rows.length || (rows[m.sel] && rows[m.sel].header)) m.sel = this.firstSel(rows);
    const row = rows[m.sel];
    if (Input.pressed('b')) { if (m.only) Game.menu = null; else m.focus = 'side'; Sfx.blip(); return; }
    if (!m.only && (Input.pressed('l') || Input.pressed('r'))) {
      // Q / E — соседний раздел, минуя пункты-действия
      const dir = Input.pressed('l') ? -1 : 1;
      do { m.sec = (m.sec + dir + MENU_SECTIONS.length) % MENU_SECTIONS.length; } while (MENU_SECTIONS[m.sec].action);
      m.sel = this.firstSel(this.menuContent(m).rows); Sfx.blip();
      return;
    }
    if (Input.pressed('up')) { m.sel = this.moveSel(rows, m.sel, -1); Sfx.blip(); }
    if (Input.pressed('down')) { m.sel = this.moveSel(rows, m.sel, 1); Sfx.blip(); }
    if (!row) return;
    if (Input.pressed('left')) { if (row.left) row.left(); else if (!m.only) { m.focus = 'side'; Sfx.blip(); } }
    if (Input.pressed('right') && row.right) row.right();
    if (Input.pressed('a') && row.a) row.a();
    if (Input.pressed('x') && row.x) row.x();
  },
  menuAction(id) {
    if (id === 'resume') { Game.menu = null; return; }
    if (id === 'title') { Game.toTitle(); return; }
    if (id === 'newgame') {
      Game.menu = null;
      Game.choose('', 'Начать заново? Текущее сохранение будет стёрто.', [
        { label: 'Да, начать заново', fn: () => { Save.clear(); Game.newGame(); } },
        { label: 'Нет', fn: () => { } },
      ]);
    }
  },

  // ---------- Разметка ----------
  MENU: { sideX: 10, sideW: 76, top: 34, listX: 94, listW: 108, rowH: 13, rows: 11, detailX: 210 },
  menuLayout(m, content) {
    const L = this.MENU, sec = MENU_SECTIONS[m.sec], wide = sec.wide;
    const listX = m.only ? 20 : L.listX;
    const listW = wide ? (m.only ? 280 : 214) : L.listW;
    const top = content.tabs ? 50 : 38, maxRows = wide ? 10 : 12;
    const n = content.rows.length, win = Math.min(n, maxRows);
    const first = clamp(m.sel - Math.floor(win / 2), 0, Math.max(0, n - win));
    return { listX, listW, top, first, win, wide, detailX: wide ? listX : L.detailX, detailY: wide ? top + maxRows * L.rowH + 6 : top };
  },
  menuShapes() {
    const m = Game.menu, L = this.MENU, content = this.menuContent(m), lay = this.menuLayout(m, content);
    bctx.fillStyle = 'rgba(4,3,8,0.6)'; bctx.fillRect(0, 0, W, H);
    box(4, 4, W - 8, H - 8, 0.96);
    bctx.fillStyle = '#5a4a60'; bctx.fillRect(8, 26, W - 16, 1);
    if (!m.only) {
      bctx.fillRect(L.sideX + L.sideW + 2, 30, 1, H - 52);
      MENU_SECTIONS.forEach((s, i) => {
        const y = L.top + i * 15 + (s.action ? 8 : 0);
        if (i === m.sec) { bctx.fillStyle = m.focus === 'side' ? 'rgba(255,224,128,0.18)' : 'rgba(255,224,128,0.08)'; bctx.fillRect(L.sideX - 2, y - 3, L.sideW, 13); }
      });
    }
    // Строки раздела
    const rows = content.rows.slice(lay.first, lay.first + lay.win);
    rows.forEach((r, k) => {
      const i = k + lay.first, y = lay.top + k * L.rowH;
      if (r.header) { bctx.fillStyle = '#3a3040'; bctx.fillRect(lay.listX, y + 8, lay.listW, 1); return; }
      if (i === m.sel && m.focus === 'content') { bctx.fillStyle = 'rgba(255,224,128,0.14)'; bctx.fillRect(lay.listX - 2, y - 3, lay.listW + 4, 12); }
      const img = r.icon && Art.spr[r.icon];
      if (img && img.width) drawSpr(bctx, img, lay.listX + 4 - img.width / 2, y + 3 - img.height / 2);
      if (r.bar !== undefined) {
        const bx = lay.listX + lay.listW - 60, by = y + 8;
        bctx.fillStyle = '#1a1420'; bctx.fillRect(bx, by, 58, 1);
        bctx.fillStyle = '#c8b0ff'; bctx.fillRect(bx, by, Math.round(58 * clamp(r.bar, 0, 1)), 1);
      }
    });
    if (!lay.wide && !m.only) { bctx.fillStyle = '#3a3040'; bctx.fillRect(lay.detailX - 5, 34, 1, H - 60); }
  },
  menuText() {
    const m = Game.menu, L = this.MENU, sec = MENU_SECTIONS[m.sec], p = Game.player;
    const content = this.menuContent(m), lay = this.menuLayout(m, content);
    // Шапка
    text(m.only ? 'Настройки' : sec.name, 12, 10, { size: 9, color: '#bff8ff' });
    if (p && !m.only) {
      const parts = [`Ур. ${p.level}`, `медяки ${Inv.count('coins')}`];
      if (Inv.count('crystals')) parts.push(`кристаллы ${Inv.count('crystals')}`);
      if (Game.flags.guildMember) parts.push(`ранг ${Quests.rank()}`);
      text(parts.join('  ·  '), W - 12, 13, { size: 6, align: 'right', color: '#ffe080' });
    }
    // Разделы
    if (!m.only) MENU_SECTIONS.forEach((s, i) => {
      const y = L.top + i * 15 + (s.action ? 8 : 0), on = i === m.sec;
      text(s.name, L.sideX + 2, y, { size: 6.5, color: on ? '#ffe080' : s.action ? '#9ad8ff' : '#d8d0c0' });
    });
    if (sec.action && !m.only) {
      const hints = { resume: 'Вернуться в игру.', title: 'Сохранить и выйти на титульный экран.', newgame: 'Начать заново. Текущее сохранение будет стёрто.' };
      text(hints[sec.id], lay.listX, 40, { size: 6.5, color: '#b8b0a0' });
    }
    // Вкладки внутри раздела
    if (content.tabs) {
      let x = lay.listX;
      content.tabs.forEach((t, i) => {
        text(t, x, 34, { size: 5.8, color: i === content.tab ? '#ffe080' : '#7a7280' });
        dctx.font = font(5.8); x += dctx.measureText(t).width / S + 9;
      });
    }
    // Строки
    content.rows.slice(lay.first, lay.first + lay.win).forEach((r, k) => {
      const i = k + lay.first, y = lay.top + k * L.rowH, sel = i === m.sel && m.focus === 'content';
      if (r.header) { text(r.label, lay.listX, y, { size: 5.8, color: '#9a8aa8' }); return; }
      const tx = lay.listX + (r.icon ? 12 : 2);
      const valueW = r.value ? Math.min(70, r.value.length * 4.2) : 0;
      let label = r.label;
      dctx.font = font(6.5);
      while (label.length > 3 && dctx.measureText(label).width / S > lay.listW - (tx - lay.listX) - valueW - 4) label = label.slice(0, -2) + '…';
      text(label, tx, y, { size: 6.5, color: sel ? '#ffe080' : r.color || '#e8e0d0' });
      if (r.value) text(r.value, lay.listX + lay.listW, y + (r.bar !== undefined ? -1 : 0), { size: 6, align: 'right', color: sel ? '#ffe080' : '#aaa' });
    });
    if (lay.first > 0) text('▲', lay.listX + lay.listW / 2, lay.top - 8, { size: 5, color: '#889' });
    if (lay.first + lay.win < content.rows.length) text('▼', lay.listX + lay.listW / 2, lay.top + lay.win * L.rowH - 3, { size: 5, color: '#889' });
    // Описание выбранного
    const row = m.focus === 'content' ? content.rows[m.sel] : null;
    if (row && row.desc) {
      const width = lay.wide ? lay.listW : W - 14 - lay.detailX, maxLines = lay.wide ? 3 : 16;
      wrap(row.desc, width, 6).slice(0, maxLines).forEach((l, i) => text(l, lay.detailX, lay.detailY + i * 9, { size: 6, color: '#d8d0c0' }));
    } else if (m.focus === 'side' && !sec.action) {
      text('Space или → — открыть раздел', lay.listX, 40, { size: 6, color: '#7a7280' });
    }
    // Подвал
    const foot = m.only ? 'Space / ← → — изменить · Shift — назад'
      : m.focus === 'side' ? '↑↓ — раздел · Space — открыть · Shift / Enter — закрыть'
      : content.tabs ? '← → — вкладка · Space — использовать · J — на кнопку E · Q/E — раздел · Shift — назад'
      : sec.id === 'settings' ? '← → — изменить · Space — переключить · Q/E — раздел · Shift — назад'
      : '↑↓ — выбор · Q/E — соседний раздел · Shift — назад · Enter — закрыть';
    text(foot, W / 2, H - 17, { size: 5.5, align: 'center', color: '#889' });
  },

  // Подсказка по клавишам на титульном экране
  controls(x, y, size) {
    [['WASD', 'идти'], ['Space', 'действие'], ['Shift', 'рывок'], ['J', 'удар'], ['K', 'нож'], ['E', 'быстрая'], ['Enter', 'меню']]
      .forEach(([k, v], i) => { text(k, x, y + i * 8, { size, color: '#ffe080' }); text(v, x + 34, y + i * 8, { size, color: '#b8b0a0' }); });
  },
});
