'use strict';
// Смазанный свиток: страницы с выцветшими (~слово~) и залитыми (███) словами.

Object.assign(UI, {
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
});
