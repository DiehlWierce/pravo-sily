'use strict';
// Интерфейс собирается в один объект UI из нескольких файлов: диалог, вещи, свиток, HUD, титульный экран.
// Каждая часть рисуется в два прохода: *Shapes — фигуры в буфер 320×240, *Text — текст поверх в масштабе экрана.

const UI = {};

// ---------- Диалог с выбором ----------
Object.assign(UI, {
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
  // Длинный список выбора прокручивается окном по 8 строк
  choiceWindow(line, d) {
    const n = line.choices.length, rows = Math.min(n, 8), top = clamp(d.sel - 4, 0, Math.max(0, n - rows));
    return { top, rows };
  },
  dialogShapes() {
    const d = Game.dialog, line = d.lines[d.i];
    const n = line.choices && d.chars >= line.text.length ? this.choiceWindow(line, d).rows : 0;
    box(8, H - 66 - n * 10, W - 16, 58 + n * 10);
  },
  dialogText() {
    const d = Game.dialog, line = d.lines[d.i];
    const win = line.choices && d.chars >= line.text.length ? this.choiceWindow(line, d) : null;
    const n = win ? win.rows : 0, top = H - 62 - n * 10;
    if (line.who) text(line.who, 16, top, { size: 6.5, color: line.who === 'Я' ? '#bff8ff' : '#e0b0a0' });
    wrap(line.text.slice(0, Math.floor(d.chars)), W - 36, 7).slice(0, 4).forEach((l, i) => text(l, 16, top + 10 + i * 9, { size: 7, color: line.who ? '#f4ecd8' : '#d8c8a8' }));
    if (win) {
      line.choices.slice(win.top, win.top + win.rows).forEach((c, k) => {
        const i = k + win.top;
        text((i === d.sel ? '▶ ' : '  ') + c.label, 22, top + 50 + k * 10, { size: 7, color: i === d.sel ? '#ffe080' : '#b8b0a0' });
      });
      if (win.top > 0) text('▲', W - 20, top + 50, { size: 5, color: '#889' });
      if (win.top + win.rows < line.choices.length) text('▼', W - 20, top + 40 + win.rows * 10, { size: 5, color: '#889' });
    } else if (d.chars >= line.text.length && Math.floor(Game.time * 3) % 2) text('▼', W - 18, H - 17, { size: 6, color: '#bbb' });
  },
});
