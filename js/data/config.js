'use strict';
// Баланс в одном месте: скорости, стоимость действий, урон, правила кражи и погонь.
// Меняешь число здесь — меняется везде. В Godot это станет ресурсом config.tres.

const CONFIG = {
  saveKey: 'pravo-sily-save-v3',
  saveVersion: 4,

  player: {
    speed: 72, maxHp: 10, maxStamina: 100,
    dash: { speed: 235, time: 0.16, cooldown: 0.5, cost: 20 },
    attack: { time: 0.2, cost: 7 },
    throwKnife: { cost: 6, cooldown: 0.35, speed: 240, life: 0.6 },
    staminaRegen: 22, staminaRegenPerLevel: 5, staminaRegenDelay: 0.6,
    invulAfterHit: 1,
  },

  // Уровни героя: опыт до следующего и характеристика по кругу
  levels: { xpBase: 15, xpPower: 1.5, statOrder: ['str', 'hp', 'sta'], hpPerLevel: 3, staminaPerLevel: 15, damagePerStr: 0.5 },

  // Звери растут с уровнем
  enemyLevel: { hp: 0.4, dmg: 0.12 },

  // Кража: поймали — лещ, немного здоровья и хозяин настороже
  theft: {
    slapDamage: 1, retryCooldown: 3, suspicion: 4.5, witnessRadius: 170,
    hold: { stall: 1.3, chest: 1.2, crate: 0.9, pendant: 1.6 },
  },

  // Прохожие видят кражу в узком конусе
  walker: { range: 64, half: 0.75, speed: [20, 32] },

  // Погони главы 0
  chase: {
    marketThug: { speed: 66, range: 96, half: 0.8 },
    lantern: { speed: 58, patrolSpeed: 24, range: 72, half: 0.7 },
    lanternHunt: { speed: 64, huntSpeed: 42, range: 88, half: 0.8 },
    collector: { speed: 74 }, gangThug: { speed: 72 },
  },
};

const STAT_NAMES = { str: 'Сила', hp: 'Здоровье', sta: 'Выносливость' };
