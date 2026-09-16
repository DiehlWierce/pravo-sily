'use strict';
// Титульный экран.

const GAME_SUBTITLE = 'Главы 0–2 · Крысёныш';

Object.assign(UI, {
  titleOptions() { return Save.has() ? ['Продолжить', 'Новая игра', 'Настройки'] : ['Новая игра', 'Настройки']; },
  updateTitle() {
    const o = this.titleOptions(); Game.titleSel = clamp(Game.titleSel || 0, 0, o.length - 1);
    if (Input.pressed('up')) { Game.titleSel = (Game.titleSel + o.length - 1) % o.length; Sfx.blip(); }
    if (Input.pressed('down')) { Game.titleSel = (Game.titleSel + 1) % o.length; Sfx.blip(); }
    if (Input.pressed('a') || Input.pressed('start')) {
      const pick = o[Game.titleSel];
      if (pick === 'Продолжить') Game.loadGame();
      else if (pick === 'Новая игра') Game.newGame();
      else UI.openMenu('settings');
    }
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
    if (Game.menu) return;
    text('ПРАВО СИЛЫ', W / 2, 40, { size: 22, align: 'center', color: '#bff8ff' });
    text(GAME_SUBTITLE, W / 2, 66, { size: 7, align: 'center', color: '#a8b8c0' });
    this.titleOptions().forEach((o, i) => text((i === Game.titleSel ? '▶ ' : '  ') + o, W / 2 - 30, 106 + i * 14, { size: 8, color: i === Game.titleSel ? '#ffe080' : '#b8b0a0' }));
    this.controls(118, 146, 5.5);
  },
});
