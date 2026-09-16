'use strict';
// Сюжет: общий узел для глав. Каждая глава — отдельный модуль (story/chapter0.js …), который в init()
// подписывается на события движка (engine/events.js). Главы не вызывают друг друга напрямую.
//
// Состояние сюжета — Game.flags (сохраняется целиком):
//   chapter — номер главы; step — шаг глав 0–1; c2step — шаг главы 2; прочие флаги — у глав.

const DUSK = 'rgba(18,22,58,0.5)';

const Story = {
  chapters: [],
  get step() { return Game.flags.step; },
  set step(v) { Game.flags.step = v; },
  get p() { return Game.player; },

  register(chapter) { this.chapters.push(chapter); },
  init() { for (const c of this.chapters) c.init(); },

  // Новая игра начинается с первой главы
  start() { this.chapters[0].start(); },
  // Пересчитать цель текущей главы (после загрузки, смерти, покупки)
  refreshObjective() {
    const c = this.chapters.find(ch => ch.id === Game.flags.chapter);
    if (c && c.objective) c.objective();
  },
};
