'use strict';
// Запуск: подключение систем к событиям и главный цикл.
// Ошибка в кадре не останавливает игру: она пишется в консоль и на экран, цикл продолжается.

Story.init();
Quests.init();
Errands.init();

const Loop = {
  last: performance.now(), error: null, errorT: 0, paused: false,
  frame(now) {
    const dt = Math.min(1 / 30, (now - this.last) / 1000); this.last = now;
    if (this.paused) { requestAnimationFrame(t => this.frame(t)); return; }   // автотест управляет кадрами сам
    try {
      Game.update(dt);
      Game.draw();
    } catch (e) {
      console.error(e);
      this.error = String(e && e.message || e); this.errorT = 6;
      Game.transition = null; Game.fade = 0;   // не оставляем чёрный экран перехода
    }
    if (this.errorT > 0) {
      this.errorT -= dt;
      dctx.fillStyle = 'rgba(80,0,0,0.85)'; dctx.fillRect(0, 0, screen.width, 12 * S);
      text('Ошибка: ' + this.error, 4, 2, { size: 5.5, color: '#fff' });
    }
    requestAnimationFrame(t => this.frame(t));
  },
};
requestAnimationFrame(t => Loop.frame(t));

// Проверка всей игры: открыть index.html?smoke
if (/[?&]smoke/.test(location.search)) {
  const s = document.createElement('script'); s.src = 'tests/smoke.js'; document.body.appendChild(s);
}
