'use strict';
// HUD: шкалы, быстрая кнопка, деньги, подсказки, реплики над головами, указатель цели, баннеры.

Object.assign(UI, {
  hudShapes() {
    const p = Game.player, s = Art.spr;
    // Полоски: сердце — здоровье, молния — выносливость, кристалл — энергия, облако — отравление
    const bar = (y, icon, v, max, col, mark) => {
      const img = s[icon];
      drawSpr(bctx, img, 4, y + 2 - Math.floor(img.height / 2));
      bctx.fillStyle = '#000a'; bctx.fillRect(14, y - 1, 56, 6);
      bctx.fillStyle = '#1a1420'; bctx.fillRect(15, y, 54, 4);
      bctx.fillStyle = col; bctx.fillRect(15, y, Math.round(54 * clamp(v / max, 0, 1)), 4);
      if (mark) { bctx.fillStyle = '#fff8'; bctx.fillRect(42, y - 1, 1, 6); }
    };
    bar(5, 'heart', p.hp, p.maxHp, p.hp < p.maxHp * 0.3 ? '#ff4040' : '#d02040');
    bar(13, 'iconBolt', p.stamina, p.maxStamina, p.stamina < p.maxStamina * 0.25 ? '#ff8040' : '#ffd040');
    if (p.implant) { bar(21, 'crystal', p.implant.energy, 100, '#7cf0ff'); bar(29, 'iconCloud', p.implant.toxin, 100, p.implant.toxin >= 50 ? '#b0ff50' : '#6aa040', true); }
    // Быстрая кнопка
    const q = p.quickItem && Inv.count(p.quickItem) && ITEMS[p.quickItem];
    bctx.fillStyle = '#000a'; bctx.fillRect(4, H - 22, 18, 18);
    bctx.strokeStyle = q ? '#ffe080' : '#5a4a60'; bctx.strokeRect(4.5, H - 21.5, 17, 17);
    if (q) { const img = s[q.icon]; drawSpr(bctx, img, 13 - img.width / 2, H - 13 - img.height / 2); }
    let rx = W - 40;
    if (Inv.count('coins') || World.theme === 'slums') { drawSpr(bctx, s.coin, rx - 10, 5); rx -= 26; }
    if (Inv.count('crystals')) { drawSpr(bctx, s.crystal, rx - 10, 4); rx -= 26; }
    if (Game.hintT > 0 && Game.hintText && !Game.dialog && !Game.menu && !Game.reader) box(10, H - 44, W - 20, 22, 0.72);
    const pr = Game.prompt;
    if (pr && !Game.dialog && !Game.menu && !Game.reader && pr.progress > 0) {
      const sx = Math.round(pr.x - Game.cam.x), sy = Math.round(pr.y - Game.cam.y);
      bctx.strokeStyle = '#7cf0ff'; bctx.beginPath(); bctx.arc(sx, sy - 6, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(pr.progress, 0, 1)); bctx.stroke();
    }
    const b = Game.bossBar;
    if (b && b.alive) { bctx.fillStyle = '#000b'; bctx.fillRect(100, H - 12, 120, 6); bctx.fillStyle = '#a02838'; bctx.fillRect(101, H - 11, Math.round(118 * b.hp / b.maxHp), 4); }
    this.bubbleShapes();
    this.waypointShapes();
  },
  // Подложка под реплики прохожих
  bubbleShapes() {
    if (Game.dialog || Game.menu || Game.reader) return;
    for (const b of Game.bubbles) {
      const w = Math.min(150, b.text.length * 3.3 + 8), x = Math.round(b.e.x - Game.cam.x - w / 2), y = Math.round(b.e.y - Game.cam.y - 34);
      bctx.fillStyle = `rgba(240,232,210,${clamp(b.ttl * 2, 0, 0.88)})`; bctx.fillRect(x, y, w, 9);
      bctx.fillRect(Math.round(b.e.x - Game.cam.x) - 1, y + 9, 3, 2);
    }
  },
  waypointShapes() {
    const wp = Game.waypoint; Game._wp = null;
    if (!wp || Game.dialog) return;
    const sx = wp.x - Game.cam.x, sy = wp.y - Game.cam.y, pulse = 0.6 + 0.4 * Math.sin(Game.time * 6);
    bctx.fillStyle = `rgba(255,210,90,${pulse})`;
    if (sx > 14 && sx < W - 14 && sy > 30 && sy < H - 40) {
      const y = sy - 22 + Math.sin(Game.time * 5) * 2;
      bctx.beginPath(); bctx.moveTo(sx - 4, y); bctx.lineTo(sx + 4, y); bctx.lineTo(sx, y + 6); bctx.fill();
      Game._wp = { x: sx, y: y - 9, label: wp.label };
      return;
    }
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    const cx = clamp(sx, 14, W - 14), cy = clamp(sy, 36, H - 50);
    bctx.save(); bctx.translate(Math.round(cx), Math.round(cy)); bctx.rotate(a);
    bctx.beginPath(); bctx.moveTo(8, 0); bctx.lineTo(-4, -6); bctx.lineTo(-1, 0); bctx.lineTo(-4, 6); bctx.fill();
    bctx.restore();
    Game._wp = { x: clamp(cx - Math.cos(a) * 16, 30, W - 30), y: cy - Math.sin(a) * 12 - 3, label: wp.label };
  },
  hudText() {
    if (Game.menu) return;
    const p = Game.player;
    const q = p.quickItem && Inv.count(p.quickItem);
    text('E', 6, H - 21, { size: 5, color: q ? '#ffe080' : '#7a6a80' });
    if (q > 1) text('×' + q, 21, H - 12, { size: 5, align: 'right', color: '#e8e0d0' });
    text(`Ур.${p.level}`, W - 4, 4, { size: 6.5, align: 'right', color: '#c8b0ff' });
    let rx = W - 40;
    if (Inv.count('coins') || World.theme === 'slums') { text(String(Inv.count('coins')), rx + 1, 4, { size: 6.5, color: '#ffe080' }); rx -= 26; }
    if (Inv.count('crystals')) { text(String(Inv.count('crystals')), rx + 1, 4, { size: 6.5, color: '#bff8ff' }); rx -= 26; }
    if (Game.objective && !Game.dialog && !Game.menu) text('▸ ' + Game.objective, W - 4, 15, { size: 5.5, align: 'right', color: '#e8d8a8' });
    if (Game.menu || Game.reader) return;
    for (const l of Game.labels) text(l.text, l.x - Game.cam.x, l.y - Game.cam.y, { size: 4.5, align: 'center', color: l.color });
    for (const f of Game.floaters) text(f.text, f.x - Game.cam.x, f.y - Game.cam.y, { size: 5.5, align: 'center', color: f.color, alpha: clamp(f.ttl, 0, 1) });
    if (!Game.dialog) for (const b of Game.bubbles) text(b.text, b.e.x - Game.cam.x, b.e.y - Game.cam.y - 33, { size: 4.6, align: 'center', color: '#2a1a10', shadow: false, alpha: clamp(b.ttl * 2, 0, 1) });
    if (Game.bossBar && Game.bossBar.alive) text(Game.bossBar.name, W / 2, H - 21, { size: 5.5, align: 'center', color: '#e0b0c0' });
    if (Game._wp && Game._wp.label) text(Game._wp.label, Game._wp.x, Game._wp.y, { size: 5, align: 'center', color: '#ffe0a0' });
    if (Game.hintT > 0 && Game.hintText && !Game.dialog && !Game.menu && !Game.reader) {
      const lines = wrap(Game.hintText, W - 32, 6);
      lines.slice(0, 2).forEach((l, i) => text(l, W / 2, H - 42 + i * 9 + (lines.length === 1 ? 4 : 0), { size: 6, align: 'center', color: '#fff' }));
    }
    const pr = Game.prompt;
    if (pr && !Game.dialog && !Game.menu && !Game.reader) text(pr.label, pr.x - Game.cam.x, pr.y - Game.cam.y - 2, { size: 5.5, align: 'center', color: '#fff' });
    if (Game.banner) {
      const bn = Game.banner, a = clamp(Math.min(bn.t, bn.max - bn.t) * 2, 0, 1);
      text(bn.title, W / 2, 78, { size: 15, align: 'center', color: bn.color || '#bff8ff', alpha: a });
      if (bn.sub) text(bn.sub, W / 2, 98, { size: 7, align: 'center', color: '#9ad', alpha: a });
    }
  },
});
