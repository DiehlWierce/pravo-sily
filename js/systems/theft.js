'use strict';
// Кражи и обыски. Держишь Space у прилавка, сундука или ящика; если в этот момент тебя видит
// хозяин или любой свидетель со взглядом (прохожий, стражник, фонарщик) — поймали.
//   Кража (у вещи есть хозяева) — лещ: немного здоровья, отбрасывает, хозяин настороже.
//   Обыск ящика в людном месте — окрик и толчок.
// Тайминг виден: хозяин перед поворотом показывает «?», а настороженный — «!» и смотрит прямо на героя.

const Theft = {
  witness(c) {
    const p = Game.player;
    for (const role of c.owners) {
      const w = Game.roles[role];
      if (w && !w.hidden && w.seesPlayer && w.seesPlayer()) return w;
    }
    if (!c.watched && !c.stealing) return null;
    for (const n of Game.npcs) {
      if (n.hidden || !n.seesPlayer || c.owners.includes(n.role)) continue;
      if (n instanceof Chaser && !n.active) continue;
      if (dist(n.x, n.y, p.x, p.y) < CONFIG.theft.witnessRadius && n.seesPlayer()) return n;
    }
    return null;
  },

  caught(seer, c) {
    const p = Game.player, n = norm(p.x - seer.x, p.y - seer.y), T = CONFIG.theft;
    const P = PERSONAS[seer.role] || {}, name = P.name || this.passerbyName(seer);
    c.cool = Game.time + T.retryCooldown;
    for (const role of c.owners) { const w = Game.roles[role]; if (w && w.suspect) w.suspect(T.suspicion); }
    if (seer.suspect) seer.suspect(T.suspicion);
    knock(p, n.x * 220, n.y * 220);
    const inside = World.theme === 'interior';
    if (c.stealing) {
      Sfx.slap(); FX.burst(p.x, p.y - 12, '#fff4a0', 8, 40); FX.shake = Math.max(FX.shake, 3);
      if (p.hp > 1) p.hp = Math.max(1, p.hp - T.slapDamage);
      p.invul = 0.6; Game.pain(0.7);
      Game.hint(`${name}: «${P.slap || pick(SLAP_LINES)}» Лещ по уху!`, 3.2);
      Game.stats.caught = (Game.stats.caught || 0) + 1;
    } else {
      Sfx.hurt();
      Game.hint(`${name}: «${inside ? 'Пошёл вон из моего дома!' : 'Эй! Не твоё — не трожь!'}»`, 2.5);
    }
    if (inside) Game.after(0.7, () => Game.exitInterior());
    Events.emit('theft:caught', seer, c);
  },

  passerbyName(n) { return ['kindwoman', 'washer', 'girl', 'lady', 'oldlady', 'mother', 'widow'].includes(n.who) ? 'Прохожая' : 'Прохожий'; },

  // Конус взгляда рисуем только у тех, кого стоит опасаться вору
  showCone(w) { return Game.props.some(c => c instanceof Container && !c.used && c.owners.includes(w.role)); },
};
