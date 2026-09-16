'use strict';
// Шина событий: движок сообщает «что случилось», главы и системы решают, что с этим делать.
// Аналог сигналов Godot. Список событий — в docs/architecture.md.
//
//   Events.on('kill', e => ...)            — подписаться
//   Events.emit('kill', enemy)             — оповестить всех
//   Events.allow('can:enter', 'city')      — вопрос-разрешение: false от любого подписчика запрещает
//   Events.handle('npc:talk', npc)         — первый подписчик, вернувший true, забирает событие

const Events = {
  handlers: {},
  on(name, fn) { (this.handlers[name] || (this.handlers[name] = [])).push(fn); return fn; },
  off(name, fn) { const l = this.handlers[name]; if (l) this.handlers[name] = l.filter(f => f !== fn); },
  emit(name, ...args) { for (const fn of this.handlers[name] || []) fn(...args); },
  allow(name, ...args) { for (const fn of this.handlers[name] || []) if (fn(...args) === false) return false; return true; },
  handle(name, ...args) { for (const fn of this.handlers[name] || []) if (fn(...args)) return true; return false; },
};
