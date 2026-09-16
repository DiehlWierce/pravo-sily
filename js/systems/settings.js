'use strict';
// Настройки игрока. Хранятся отдельно от сохранения: «Начать заново» их не сбрасывает.
// Описание пунктов — в DEFS: меню настроек строится по нему само.

const Settings = {
  key: 'pravo-sily-settings',
  data: { volume: 8, textSpeed: 1, shake: true, cones: true, levels: true },

  DEFS: [
    { id: 'volume', name: 'Громкость', type: 'range', min: 0, max: 10, desc: 'Громкость звуков. 0 — без звука.' },
    { id: 'textSpeed', name: 'Скорость текста', type: 'choice', options: ['Медленно', 'Обычно', 'Быстро', 'Сразу'], desc: 'Как быстро печатаются реплики в диалогах.' },
    { id: 'shake', name: 'Тряска экрана', type: 'bool', desc: 'Экран вздрагивает от ударов и прыжков зверей. Выключите, если укачивает.' },
    { id: 'cones', name: 'Конусы взгляда', type: 'bool', desc: 'Показывать, куда смотрят хозяева прилавков и фонарщики. Без них красть и прятаться сложнее.' },
    { id: 'levels', name: 'Уровни зверей', type: 'bool', desc: 'Подпись «ур. N» над зверями рядом с героем.' },
    { id: 'fullscreen', name: 'Полный экран', type: 'action', desc: 'Развернуть игру на весь экран или вернуть окно.' },
  ],

  load() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem(this.key)) || {}); } catch (e) { }
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { } },
  get(id) { return this.data[id]; },

  // Текст значения для меню
  valueText(d) {
    const v = this.data[d.id];
    if (d.type === 'range') return '▮'.repeat(v) + '▯'.repeat(d.max - v);
    if (d.type === 'choice') return d.options[v];
    if (d.type === 'bool') return v ? 'Вкл' : 'Выкл';
    if (d.id === 'fullscreen') return document.fullscreenElement ? 'Вкл' : 'Выкл';
    return '';
  },
  // dir: -1 / +1 — стрелки, 0 — Space
  change(d, dir) {
    if (d.type === 'range') this.data[d.id] = clamp(this.data[d.id] + (dir || 1), d.min, d.max);
    else if (d.type === 'choice') this.data[d.id] = (this.data[d.id] + (dir || 1) + d.options.length) % d.options.length;
    else if (d.type === 'bool') this.data[d.id] = !this.data[d.id];
    else if (d.id === 'fullscreen') {
      try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) { }
    }
    this.save(); Sfx.blip();
  },

  // Применение настроек к движку
  volumeScale() { return this.data.volume / 8; },
  textCharsPerSecond() { return [25, 50, 90, 100000][this.data.textSpeed]; },
};
Settings.load();
