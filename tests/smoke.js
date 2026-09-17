'use strict';
// Автотест всей игры: открыть index.html?smoke (через локальный сервер).
// Прогоняет сцены, главы 0–2, кражи, поручения, поиск пути, сохранения. Итог — на экране и в window.SMOKE.
// Тест стирает сохранение в localStorage.

(function () {
  const results = [];
  const ok = (name, cond, info = '') => { results.push({ name, ok: !!cond, info: cond ? '' : String(info) }); };
  const step = (sec = 1 / 60) => { for (let t = 0; t < sec; t += 1 / 60) { Game.update(1 / 60); } };
  const skip = () => { let k = 0; while (Game.dialog && k++ < 40) { const d = Game.dialog; const line = d.lines[d.i]; if (line.choices) return; Game.dialog = null; d.onDone && d.onDone(); } };
  const choose = (sub) => {
    const d = Game.dialog; if (!d) return false;
    for (let i = d.i; i < d.lines.length; i++) {
      const line = d.lines[i];
      if (!line.choices) continue;
      const c = line.choices.find(x => x.label.includes(sub));
      if (!c) return false;
      Game.dialog = null; c.fn && c.fn(); return true;
    }
    return false;
  };
  const run = (sec, until) => { for (let t = 0; t < sec; t += 1 / 60) { Game.update(1 / 60); skip(); if (until && until()) return true; } return !!(until && until()); };
  const fresh = () => { Save.clear(); Game.newGame(); run(1); skip(); Game.flags.godmode = false; };
  const tp = (tx, ty) => { const p = Game.player; const c = tc(tx, ty); p.x = c.x; p.y = c.y; p.kvx = p.kvy = 0; };
  const talk = (role) => { const n = Game.roles[role] || Game.npcs.find(x => x.role === role); if (!n) return false; Talk.open(n); return true; };
  const safe = (name, fn) => { try { fn(); } catch (e) { ok(name + ': исключение', false, e.stack.split('\n').slice(0, 3).join(' | ')); } };

  Loop.paused = true;
  const t0 = performance.now();

  // ---------- Сцены: загрузка, кадры, отрисовка, никто не стоит в стене ----------
  safe('Сцены', () => {
    fresh();
    for (const name of Object.keys(SCENES)) {
      Game.loadScene(name); Game.timers = []; skip();
      step(0.5); Game.draw();
      const stuck = [...Game.npcs, ...Game.enemies, ...Game.critters].filter(e => !e.hidden && World.boxHits(e.x, e.y, e.hw || 4, e.hh || 3, false));
      ok(`сцена ${name}: без ошибок и никто не застрял в стене`, !stuck.length, stuck.map(e => `${e.role || e.kind || e.who}@${tileOf(e.x)},${tileOf(e.y)}`).join(' '));
    }
  });

  // ---------- Глава 0 ----------
  safe('Глава 0', () => {
    fresh();
    ok('новая игра: дом и цель про хлеб', World.name === 'home' && Game.objective.includes('буханки'), Game.objective);
    Game.loadScene('slums'); skip();
    Inv.add('coins', 15);
    for (let i = 0; i < 3; i++) { talk('baker'); choose('Купить'); skip(); }
    ok('купил три буханки', Inv.count('bread') === 3, Inv.count('bread'));
    Game.loadScene('home'); skip(); talk('father'); skip();
    ok('отец принял хлеб', Game.flags.breadDone);
    Inv.add('coins', 20); Game.loadScene('apothecary'); skip(); talk('apothecary'); choose('Купить'); skip();
    Game.loadScene('home'); skip(); talk('mother'); skip();
    ok('лекарство матери', Game.flags.medDone && !Inv.count('medicine'));
    Inv.add('coins', 5); talk('father'); skip(); skip();
    ok('отец подарил нож', Game.player.hasKnife && Game.flags.coinsGiven);

    // Кража: хозяин видит — лещ и минус здоровье
    Game.loadScene('slums'); skip();
    const stall = Game.props.find(c => c instanceof Container && c.owners.includes('baker'));
    const baker = Game.roles.baker, p = Game.player;
    p.x = stall.x; p.y = stall.y + 22; baker.suspect(5); step(0.1);
    const hp = p.hp, it = stall.interaction(p);
    const seen = it && it.tick();
    ok('кража на глазах у хозяина срывается', seen === false, 'tick=' + seen);
    ok('за кражу — лещ: минус здоровье', p.hp === hp - 1 && Game.hintText.includes('Лещ'), `${hp}→${p.hp} ${Game.hintText}`);

    // Подвеска и погони
    const pendant = Game.props.find(c => c.loot && c.loot.pendant);
    pendant.used = true; Game.onContainer(pendant); skip();
    ok('погоня: двое громил', Story.step === 'chase1' && Game.npcs.filter(c => c.group === 'chase1').length === 2);
    Chapter0.endChase1(); skip();
    const stalls = Game.props.filter(c => c instanceof Container && c.kind === 'stall' && !c.used);
    ok('в сумерках товар с прилавков убран, а не висит без действия', stalls.length && stalls.every(c => c.packed && !c.interaction({ x: c.x, y: c.y + 10 })));
    ok('сумерки: 16 фонарщиков, торговцы и прохожие ушли', Story.step === 'sneak' && Game.npcs.filter(c => c.group === 'sneak').length === 16 && !Game.npcs.some(n => n instanceof Walker && !n.hidden));
    const hf = Game.tags.homeFront; p.x = hf.x; p.y = hf.y;
    run(15, () => Story.step === 'flee');
    const hunting = Game.npcs.filter(c => c.group === 'sneak' && c.state === 'hunt').length;
    ok('бегство: банда из трёх и фонарщики идут на крик', Story.step === 'flee' && Game.npcs.filter(c => c.group === 'flee' && c.active).length === 3 && hunting >= 10, `step=${Story.step} hunting=${hunting}`);
    Game.save(); Game.loadGame(); skip();
    ok('загрузка посреди бегства восстанавливает погоню', Story.step === 'flee' && Game.npcs.filter(c => c.group === 'flee').length === 3 && Game.objective.includes('ворот'), Game.objective);
    Game.player.x = 58.5 * TS; Game.player.y = 7 * TS + 8; Game.flags.godmode = true;
    run(3, () => World.name === 'forest');
    ok('вышел в лес: глава 1', World.name === 'forest' && Game.flags.chapter === 1, World.name);
    Game.flags.godmode = false;
  });

  // ---------- Поиск пути ----------
  safe('Поиск пути', () => {
    fresh(); Game.loadScene('slums'); skip(); Game.flags.step = 'test';
    Nav.ensure();
    const free = []; for (let y = 1; y < World.h - 1; y++) for (let x = 1; x < World.w - 1; x++) if (Nav.free(x, y)) free.push([x, y]);
    const p = Game.player; let reached = 0, total = 0;
    const saved = Events.handlers['chase:caught']; Events.handlers['chase:caught'] = [];
    for (let i = 0; i < 25; i++) {
      const a = free[(i * 131) % free.length], b = free[(i * 577 + 13) % free.length];
      const path = Nav.find(tc(...a).x, tc(...a).y, tc(...b).x, tc(...b).y); if (!path || path.partial) continue;
      Game.npcs = []; tp(...b); total++;
      const c = Game.addChaser(a[0], a[1], { who: 'thug', relentless: true, speed: 64, showCone: false }); c.state = 'chase';
      for (let t = 0; t < 30 && dist(c.x, c.y, p.x, p.y) >= 12; t += 1 / 60) { Game.time += 1 / 60; c.update(1 / 60); }
      if (dist(c.x, c.y, p.x, p.y) < 12) reached++;
    }
    Events.handlers['chase:caught'] = saved;
    ok(`преследователь доходит до героя: ${reached}/${total}`, reached === total);
  });

  // ---------- Глава 1 ----------
  safe('Глава 1', () => {
    fresh();
    Object.assign(Game.flags, { chapter: 1, step: 'night1', forestIntro: true });
    Game.loadScene('forest'); skip();
    const blocked = Nav.find(tc(2, 20).x, tc(2, 20).y, tc(24, 30).x, tc(24, 30).y);
    ok('завал g1 перекрывает лес целиком', blocked && blocked.partial);
    // Костёр разожгли раньше, чем поймали зайцев — обучение не должно застревать
    const fire = Game.props.find(c => c instanceof Campfire); tp(7, 19); Game.useCampfire(fire); skip(); Game.dialog = null;
    for (const r of Game.enemies.filter(e => e instanceof Rabbit).slice(0, 2)) r.takeHit(9, 'knife', 1, 0, Game.player);
    ok('костёр до зайцев: сразу «пожарить и поесть»', Story.step === 'night3', Story.step);
    Chapter1.openGate('g1');
    const open = Nav.find(tc(2, 20).x, tc(2, 20).y, tc(24, 30).x, tc(24, 30).y);
    ok('после сна завал разобран', open && !open.partial);

    // Охотник и большой прыгун дерутся по-настоящему
    Object.assign(Game.flags, { step: 'toHunter', morning: true, 'open:g1': true, 'open:g2': true, 'open:g3': true });
    Game.removed.add('forest:jumper:62,28');   // первый прыгун к этому моменту убит
    Game.loadScene('forest'); skip();
    const h = Game.tags.hunter, j = Game.tags.bigJumper;
    ok('до подхода героя оба спят', h.dormant && j.dormant);
    tp(67, 24); step(0.1);
    ok('подошёл — бой начался', Game.flags.duelStarted && !h.dormant && !j.dormant);
    let glowJ = 0, glowH = 0;
    const done = run(60, () => { glowJ = Math.max(glowJ, j.forceGlow()); glowH = Math.max(glowH, h.forceGlow()); tp(67, 24); return Game.flags.duelDone; });
    ok('охотник побеждает большого прыгуна в обычном бою', done && h.alive && !j.alive, `done=${done} hunter=${h.alive} jumper=${j.alive} hp=${j.hp}`);
    ok('звери и охотник светятся силой', glowJ > 0.5 && glowH > 0.5, `${glowJ} ${glowH}`);
    run(12, () => h.state === 'panting');
    ok('охотник вырезал кристаллы', j.looted && h.state === 'panting', h.state);
    tp(73, 20); step(0.2);
    ok('охотник замечает героя', Game.flags.hunterMet && !!Game.dialog);
    skip(); choose('Никто'); skip();
    ok('бой один на один: поляна закрыта', Story.step === 'hunterFight' && Game.flags.arenaLock && World.at(71, 20) !== '.' && Game.bossBar === h, World.at(71, 20));
    Object.assign(h, { state: 'tired', t: 5 }); h.takeHit(99, 'knife', 1, 0, Game.player); run(2); skip();
    ok('охотник повержен, поляна открыта', Game.flags.hunterDown && !Game.flags.arenaLock);
    Game.player.x = h.x + 8; Game.player.y = h.y; h.interaction(Game.player).done(); skip();
    ok('свиток и кристаллы', Inv.count('scroll') === 1 && Inv.count('crystals') >= 2);

    // Бой с охотником должен быть проходим даже в худших условиях: он зажат у деревьев и камней рядом нет
    Object.assign(Game.flags, { hunterDown: false, hunterLooted: false, hunterMet: false, arenaLock: false, step: 'toHunter', duelDone: true });
    Game.removed.delete('forest:hunter:79,15');
    Game.loadScene('forest'); skip();
    const H = Game.tags.hunter, hero = Game.player;
    Game.objects = Game.objects.filter(o => o.mass !== 'light');   // все камни убрали
    Chapter1.startHunterFight(); skip();
    H.x = 73 * TS + 4; H.y = 18 * TS;   // зажат у завала
    let tired = 0, last = '', threw = 0;
    const origThrow = H.throwAt.bind(H); H.throwAt = (t) => { threw++; return origThrow(t); };
    Game.flags.godmode = true;
    run(30, () => { if (H.state === 'tired' && last !== 'tired') tired++; last = H.state; tp(80, 20); return tired >= 2; });
    ok('зажатый охотник всё равно выдыхается и не блокирует главу', tired >= 1, `устал ${tired} раз, бросков ${threw}`);
    ok('камни кончились — охотник вырывает новые из земли', Game.objects.some(o => o.mass === 'light'), `камней ${Game.objects.filter(o => o.mass === 'light').length}`);
    // Внутри дерева тело не может сдвинуться ни на пиксель — должен выбираться сам
    const tree = [];
    for (let y = 10; y < 26 && !tree.length; y++) for (let x = 75; x < 87 && !tree.length; x++) if (World.at(x, y) === 'T') tree.push(x, y);
    if (tree.length) { const c = tc(tree[0], tree[1]); H.x = c.x; H.y = c.y; run(0.5); }
    ok('охотник выбирается, если оказался в дереве', !tree.length || !World.boxHits(H.x, H.y, H.hw, H.hh, false), `${(H.x / TS).toFixed(1)},${(H.y / TS).toFixed(1)}`);
    // В самом бою он не должен стоять столбом дольше пары секунд
    let frozen = 0, maxFrozen = 0, lastPos = { x: H.x, y: H.y }, ticks = 0;
    run(20, () => {
      tp(80, 20);
      if (++ticks % 30) return false;
      frozen = H.state === 'fight' && dist(H.x, H.y, lastPos.x, lastPos.y) < 2 ? frozen + 0.5 : 0;
      maxFrozen = Math.max(maxFrozen, frozen); lastPos = { x: H.x, y: H.y };
      return false;
    });
    ok('охотник не стоит столбом в бою', maxFrozen <= 4, `${maxFrozen}с без движения`);
    H.state = 'tired'; H.t = 3; H.takeHit(99, 'knife', 1, 0, hero); run(1); skip();
    ok('в усталости охотника можно добить', Game.flags.hunterDown);
    Game.flags.godmode = false;
  });

  // ---------- Глава 2 ----------
  safe('Глава 2', () => {
    fresh();
    Object.assign(Game.flags, { chapter: 1, step: 'deepForest', chapterEnd: true });
    Game.player.hasKnife = true;
    Game.loadScene('road'); run(2); skip();
    ok('тракт: глава 2 началась', Game.flags.chapter === 2 && Game.flags.c2step === 'road');
    // Баг: после сохранения и смерти в главе 2 цель не должна сбрасываться на «Глава 1 пройдена»
    Game.objective = 'Идти по тракту на восток'; Game.save(); Game.loadGame(); skip();
    ok('после загрузки цель главы 2 сохраняется', Game.objective === 'Идти по тракту на восток', Game.objective);

    Game.loadScene('camp'); run(1); skip();
    const beasts = Game.enemies.filter(e => e.campBeast);
    ok('у извозчика пятеро зверей', beasts.length === 5);
    for (const e of beasts) { e.takeHit(999, 'rock', 1, 0, Game.player); }
    run(2); skip();
    ok('помог Ждану: проезд даром', Game.flags.campCleared && Game.flags.ridePaid && Game.flags.carterFriend);

    Game.loadScene('gate'); skip(); talk('gateGuardA'); choose('Ждана'); skip();
    ok('ворота открыты', Game.flags.inCity && World.at(33, 13) === ':');
    Game.loadScene('camp'); Game.loadScene('gate'); skip();
    ok('шлагбаум остаётся поднятым после возвращения', World.at(33, 13) === ':', World.at(33, 13));

    Game.loadScene('city'); skip();
    ok('город: жители, прохожие, живность', Game.npcs.length > 40 && Game.critters.length > 10, `${Game.npcs.length} ${Game.critters.length}`);
    step(3); Game.draw();
    Game.loadScene('guild'); skip(); talk('guildClerk'); choose('Сослаться'); skip();
    ok('записался в гильдию', Game.flags.guildMember);
    Game.draw();
    Game.loadScene('tavern'); skip(); Game.draw();
    ok('таверна и гильдия рисуются без ошибок', true);

    // Поручение: хлеб бабке Агафье
    Game.loadScene('city'); skip();
    talk('oldLady'); choose('Поручение'); skip(); choose('Сделаю'); skip();
    ok('взял поручение', Errands.state('breadAgafya').taken);
    Inv.add('coins', 20);
    talk('cityBaker'); choose('Купить'); skip(); talk('cityBaker'); choose('Купить'); skip();
    const coins = Inv.count('coins'), xp = Game.player.xp + Game.player.level * 1000;
    talk('oldLady'); choose('Отдать'); skip();
    ok('хлеб отнесён: медяки и опыт', Errands.state('breadAgafya').done && Inv.count('coins') === coins + 8 && Game.player.xp + Game.player.level * 1000 > xp, `${coins}→${Inv.count('coins')}`);

    // Письмо ростовщику
    talk('scribe'); choose('Поручение'); skip(); choose('Сделаю'); skip();
    talk('moneylender'); choose('Вручить'); skip();
    ok('письмо доставлено', Errands.state('letterLuka').done && !Inv.count('sealedLetter'));

    // Пропавший мальчик
    talk('worriedMother'); choose('Поручение'); skip(); choose('Сделаю'); skip();
    const boy = Game.npcs.find(n => n.role === 'lostBoy');
    ok('Васятка появился в городе', !!boy);
    if (boy) { Talk.open(boy); choose('Позвать'); skip(); }
    talk('worriedMother'); choose('Отдать'); skip();
    ok('Васятка дома', Errands.state('lostBoy').done);

    // Кошель в куче мусора
    talk('merchantWife'); choose('Поручение'); skip(); choose('Сделаю'); skip();
    const pile = Game.props.find(x => x.errand === 'purseMarfa');
    ok('кошель спрятан в мусоре', !!pile);
    if (pile) { Game.player.x = pile.x; Game.player.y = pile.y + 6; pile.interaction(Game.player).done(); }
    talk('merchantWife'); choose('Отдать'); skip();
    ok('кошель вернул', Errands.state('purseMarfa').done);

    // Кража на рынке: хозяин смотрит — лещ
    const stall = Game.props.find(c => c instanceof Container && c.owners.includes('fishmonger'));
    const fm = Game.roles.fishmonger, p = Game.player;
    p.x = stall.x; p.y = stall.y + 20; fm.suspect(5); step(0.05);
    const hp = p.hp, res = stall.interaction(p).tick();
    ok('кража на рынке города на глазах у хозяина — лещ', res === false && p.hp === Math.max(1, hp - 1), `${res} ${hp}→${p.hp}`);
    ok('на рынке города 10 прилавков для кражи', Game.props.filter(c => c instanceof Container && c.kind === 'stall').length === 10);
  });

  // ---------- Меню ----------
  safe('Меню', () => {
    Game.loadScene('city'); skip();
    Inv.add('herbs', 2); Inv.add('junk', 3); Game.player.hp = 3;
    UI.openMenu();
    const opened = [];
    for (let i = 0; i < MENU_SECTIONS.length; i++) {
      const s = MENU_SECTIONS[i]; if (s.action) continue;
      Game.menu = { sec: i, sel: 0, cat: 0, focus: 'content' };
      const c = UI.menuContent(Game.menu); Game.draw();
      opened.push(`${s.id}:${c.rows.length}`);
    }
    ok('меню: все разделы открываются и рисуются', opened.length === 7, opened.join(' '));
    Game.menu = { sec: 0, sel: 0, cat: 1, focus: 'content' };
    const food = UI.menuContent(Game.menu).rows;
    ok('вещи разложены по вкладкам: в «Еде» трава, хлама нет', food.some(r => r.label === ITEMS.herbs.name) && !food.some(r => r.label === ITEMS.junk.name));
    const hp = Game.player.hp; food.find(r => r.label === ITEMS.herbs.name).a();
    ok('трава используется прямо из меню', Game.player.hp > hp && Inv.count('herbs') === 1);
    ok('в разделе «Задания» есть поручения', UI.menuContent({ sec: 3, sel: 0, focus: 'content' }).rows.some(r => r.header && r.label === 'Выполнено'));
    const vol = Settings.get('volume'); Settings.change(Settings.DEFS[0], -1);
    ok('настройки меняются и запоминаются', Settings.get('volume') === vol - 1 && JSON.parse(localStorage.getItem(Settings.key)).volume === vol - 1);
    Settings.change(Settings.DEFS[0], 1);
    Game.menu = null;
    Game.state = 'title'; UI.openMenu('settings'); Game.draw(); Game.menu = null; Game.state = 'play';
    ok('настройки открываются с титульного экрана', true);
  });

  // ---------- Старое сохранение (v3) ----------
  safe('Сохранения', () => {
    const old = { scene: 'slums', x: 100, y: 100, objective: 'x', returnTo: null,
      player: { level: 2, xp: 3, stats: { str: 2, hp: 1, sta: 1 }, maxHp: 10, hp: 7, maxStamina: 100, stamina: 50,
        inv: { coins: 9, junk: ['a', 'b'], goods: [{ name: 'Яблоки', value: 2 }], bread: 1, scroll: true, pendant: false, salve0: 2, quest: { letter: 1, cargo: 0 } },
        hasKnife: true, quickItem: 'salve0', gear: { weapon: 'knife', armor: 'rags' }, knives: 4 },
      flags: { chapter: 0, step: 'slums' }, removed: [], stats: { kills: 1, steals: 0, crystals: 0, deaths: 0, time: 5 } };
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(old));
    Game.loadGame(); skip();
    const v = Game.player.inv;
    ok('старое сохранение переводится в новый формат', v.coins === 9 && v.junk === 2 && v.apples === 1 && v.scroll === 1 && v.letter === 1 && v.knives === 4 && v.salve0 === 2, JSON.stringify(v));
  });

  // ---------- Быстродействие ----------
  safe('Скорость', () => {
    Game.loadScene('city'); skip();
    const t = performance.now();
    for (let i = 0; i < 300; i++) { Game.update(1 / 60); Game.draw(); }
    const ms = (performance.now() - t) / 300;
    ok(`город: ${ms.toFixed(2)} мс на кадр (обновление + отрисовка)`, ms < 12, ms);
  });

  Save.clear();
  const failed = results.filter(r => !r.ok);
  window.SMOKE = { passed: results.length - failed.length, failed: failed.length, results, seconds: ((performance.now() - t0) / 1000).toFixed(1) };
  console.log('SMOKE', window.SMOKE);

  // Отчёт поверх игры
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;left:8px;top:8px;right:8px;max-height:92vh;overflow:auto;margin:0;padding:10px;background:rgba(8,6,12,.94);color:#e8e0d0;font:12px/1.45 Menlo,monospace;z-index:9;border:1px solid #5a4a60';
  el.textContent = `Автотест: ${window.SMOKE.passed} пройдено, ${failed.length} с ошибками, ${window.SMOKE.seconds} с\n\n` +
    results.map(r => `${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : '\n    ' + r.info}`).join('\n');
  document.body.appendChild(el);
  Game.state = 'title'; Loop.paused = false;
})();
