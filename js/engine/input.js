'use strict';
// Ввод: клавиатура + геймпад с раскладкой хендхелда. Игра спрашивает только действия (a, b, x...), не клавиши.

const Input = (() => {
  const keys = {};
  const binds = {
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    a: ['Space'],                    // A — взаимодействие / далее (удерживать — обыскать, стащить)
    b: ['ShiftLeft', 'ShiftRight'],  // B — рывок
    x: ['KeyJ'],                     // X — удар
    y: ['KeyK'],                     // Y — метательный нож / способность
    l: ['KeyQ'],                     // L — в меню: выход в главное меню
    r: ['KeyE'],                     // R — быстрая кнопка
    start: ['Enter', 'Escape'],
  };
  const now = {}, last = {};
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    Sfx.unlock();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function update() {
    let gp = null;
    if (navigator.getGamepads) for (const g of navigator.getGamepads()) if (g) { gp = g; break; }
    const btn = i => !!(gp && gp.buttons[i] && gp.buttons[i].pressed);
    const ax = gp ? gp.axes[0] || 0 : 0, ay = gp ? gp.axes[1] || 0 : 0;
    const pad = {
      up: btn(12) || ay < -0.45, down: btn(13) || ay > 0.45,
      left: btn(14) || ax < -0.45, right: btn(15) || ax > 0.45,
      a: btn(0), b: btn(1), x: btn(2), y: btn(3), l: btn(4), r: btn(5), start: btn(9),
    };
    for (const act in binds) {
      last[act] = now[act];
      now[act] = binds[act].some(c => keys[c]) || pad[act];
    }
    if (gp && Object.values(pad).some(Boolean)) Sfx.unlock();
  }
  return { update, held: a => !!now[a], pressed: a => !!now[a] && !last[a] };
})();
