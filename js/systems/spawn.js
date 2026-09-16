'use strict';
// Спавн по описанию сцены: [вид, tx, ty, опции]. Чтобы добавить новый вид — допиши строку в SPAWNERS.
// id спавна (сцена:вид:x,y) хранится в Game.removed, когда предмет подобран или зверь разделан.

const ENEMY_TYPES = { rabbit: Rabbit, boar: Boar, spiker: Spiker, jumper: Jumper, bigJumper: BigJumper, thrower: Thrower, hunter: Hunter };

const SPAWNERS = {
  player: () => null,
  mark: (x, y, o) => ({ x, y }),
  exit: (x, y, o, tx, ty) => Game.addSpot(x, ty * TS + 4, { r: 16, label: 'Space: выйти', fn: () => Game.exitInterior() }),
  gateway: (x, y, o) => Game.addSpot(x, y, {
    r: 22, to: o.to, label: 'Space: ' + (o.label || 'идти дальше'),
    fn: () => {
      if (!Events.allow('can:enter', o.to)) return;
      Game.enterScene(o.to, o.at ? tc(o.at[0], o.at[1]) : null);
    },
  }),
  door: (x, y, o, tx, ty) => Game.addSpot(x, (ty + 1) * TS + 4, {
    r: 16, to: o.to, locked: o.locked,
    label: () => o.locked ? 'Space: дверь' : 'Space: войти',
    fn: (spot) => {
      if (o.locked) { Game.hint(['Заперто.', 'Заперто. Изнутри храпят.', 'Никого нет. Заперто.'][(tx + ty) % 3], 1.5); Sfx.clang(); return; }
      if (!Events.allow('can:enter', o.to)) return;
      Game.returnTo = { scene: World.name, x: spot.x, y: spot.y + 10 };
      Game.enterScene(o.to, null);
    },
  }),
  rock: (x, y, o, tx, ty, kind) => Game.add('objects', new Obj(kind, x, y)),
  junk: (x, y, o, tx, ty, kind, removed) => removed ? null : Game.add('props', new JunkPile(x, y, o)),
  container: (x, y, o, tx, ty, kind, removed) => { const c = Game.add('props', new Container(x, y, o)); c.used = removed; return c; },
  campfire: (x, y, o, tx, ty, kind, removed, id) => { const c = Game.add('props', new Campfire(x, y + 4, o)); c.lit = c.lit || !!Game.flags['lit:' + id]; return c; },
  herb: (x, y, o, tx, ty, kind, removed) => removed ? null : Game.add('pickups', new Pickup(kind, x, y)),
  npc: (x, y, o) => Game.add('npcs', new NPC(x, y, o)),
  watcher: (x, y, o) => Game.add('npcs', new Watcher(x, y, o)),
  walker: (x, y, o) => Game.add('npcs', new Walker(x, y, o)),
  critter: (x, y, o) => {
    if (o.flock) { const birds = spawnFlock(x, y, o.flock); Game.critters.push(...birds); return birds[0]; }
    return Game.add('critters', new Critter(x, y, o));
  },
};
SPAWNERS.crate = SPAWNERS.barrel = SPAWNERS.boulder = SPAWNERS.rock;
SPAWNERS.berries = SPAWNERS.herb;

const Spawn = {
  // Места, которые не надо сдвигать из стены: двери, выходы, метки и тайники стоят ровно там, где сказано
  exact: ['door', 'exit', 'mark', 'container', 'campfire', 'player'],
  one(s) {
    const [kind, tx, ty, o = {}] = s, id = s.id || `${World.name}:${kind}:${tx},${ty}`;
    let { x, y } = tc(tx, ty);
    if (!this.exact.includes(kind)) ({ x, y } = Game.freeSpot(x, y));
    const removed = Game.removed.has(id);
    let e;
    if (SPAWNERS[kind]) e = SPAWNERS[kind](x, y, o, tx, ty, kind, removed, id);
    else if (ENEMY_TYPES[kind]) {
      if (removed) return null;
      e = Game.add('enemies', new ENEMY_TYPES[kind](x, y, o));
    }
    if (!e) return null;
    e.sid = id;
    if (o.tag) Game.tags[o.tag] = e;
    if (o.role) Game.roles[o.role] = e;
    if (kind === 'hunter' || kind === 'bigJumper') Game.tags[kind] = e;
    return e;
  },
};
