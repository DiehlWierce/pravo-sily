'use strict';
// Разговор с жителем. Сначала главы могут перехватить разговор (особые персонажи: родители, клерк, извозчик),
// иначе строится обычное меню из PERSONAS: поговорить, лавка, скупщик, поручения, милостыня.

const Talk = {
  lines(arr) { return arr.map(([who, text]) => ({ who, text })); },

  open(npc) {
    if (Events.handle('npc:talk', npc)) return;
    const P = PERSONAS[npc.role] || { name: 'Житель', rude: true, greet: 'Чего тебе?' };
    const F = Game.flags, early = F.chapter === 0;
    const errands = Errands.choices(npc);
    if (P.rude && !errands.length && !P.shop && !P.buys) { Game.say([{ who: P.name, text: P.greet }]); return; }

    const choices = [];
    if (P.talk) choices.push({ label: 'Поговорить', fn: () => {
      const first = !F['met:' + npc.role];
      F['met:' + npc.role] = true;
      Events.emit('npc:met', npc, first);
      Game.say(this.lines(first || !P.more ? P.talk : P.more));
    } });
    choices.push(...errands);
    if (P.shop) {
      const items = SHOPS[P.shop].items;
      if (items.length <= 2) choices.push(...Shop.choices(P.shop, P.name));
      else choices.push({ label: 'Посмотреть товар', fn: () => Shop.open(P.shop, P.name) });
    }
    if (P.buys) choices.push({ label: 'Продать хлам и краденое', fn: () => this.sell(P) });
    if (early && !P.buys && !P.shop) choices.push({ label: 'Предложить хлам', fn: () => Game.say([{ who: P.name, text: Inv.count('junk') ? 'Мне твой мусор ни к чему. Скупщик на рынке берёт.' : 'У тебя и хлама-то нет.' }]) });
    if (early) choices.push({ label: 'Попросить денег', fn: () => {
      if (!P.gives) { Game.say([{ who: P.name, text: 'Самому бы кто подал.' }]); return; }
      if (F['gave:' + npc.role]) { Game.say([{ who: P.name, text: 'Я уже давал. Больше нет.' }]); return; }
      F['gave:' + npc.role] = true; Inv.add('coins', P.gives); Sfx.coin(); Events.emit('coins:changed');
      Game.say([{ who: P.name, text: P.gives > 1 ? `Держи ${P.gives} медяка. Не на сладости, понял?` : 'Держи медяк. Матери отнеси.' }]);
    } });
    if (P.begs) choices.push({ label: 'Подать медяк', fn: () => {
      if (!Inv.take('coins')) { Game.say([{ who: 'Я', text: 'У меня самого пусто.' }]); return; }
      Sfx.coin(); F.gaveBeggar = true; Events.emit('coins:changed');
      Game.say([{ who: P.name, text: 'Вот это дело. Слушай тогда: в лесу у охотников бывают мази первой ступени. Дорогая вещь. Дороже еды.' }]);
    } });
    choices.push({ label: 'Уйти', fn: () => { } });
    const greet = P.rude ? P.greet : F['met:' + npc.role] ? 'Опять ты?' : early ? 'Чего тебе, малец?' : 'Чего тебе?';
    Game.choose(P.name, greet, choices);
  },

  sell(P) {
    const n = Inv.sellable().reduce((a, id) => a + Inv.count(id), 0);
    if (!n) { Game.say([{ who: P.name, text: 'Нечего продать — нечего и болтать.' }]); return; }
    const stolen = Inv.sellable().some(id => id !== 'junk');
    const total = Inv.sellAll(); Sfx.coin(); Events.emit('coins:changed');
    Game.say([{ who: P.name, text: `Тьфу, мусор... Держи ${total} ${plural(total, 'медяк', 'медяка', 'медяков')}.` }],
      () => { if (stolen) Game.hint('Краденое ушло без вопросов.', 2); });
  },

  // Прохожий: пара слов на ходу
  passerby(w) {
    const pool = BARKS[w.barks] || BARKS.city;
    Game.say([{ who: Theft.passerbyName(w), text: pick(pool) }]);
  },
};
