'use strict';
// Заказы гильдии и хутора. Обычные повторяются бесконечно (гринд), особые — один раз.
// Ранги растут от репутации: G- … E+. Логика заказов — systems/quests.js.

const RANKS = ['G-', 'G', 'G+', 'F-', 'F', 'F+', 'E-', 'E', 'E+'];
const RANK_REP = [0, 4, 9, 15, 22, 30, 40, 52, 66];

// type: kill — убить (kind или tag, можно ограничить сценой); item — сдать предметы; find — найти место в мире
const QUEST_DEFS = {
  // ---- Гильдия, повторяемые ----
  rabbits: { giver: 'guild', rank: 'G-', repeat: true, type: 'kill', kind: 'Rabbit', need: 6, coins: 8, rep: 1, xp: 10,
    name: 'Зайцы для кухни', desc: 'Кухня гильдии просит шесть зайцев. Туши разделать не обязательно — главное, чтобы добыча была.' },
  boars: { giver: 'guild', rank: 'G-', repeat: true, type: 'kill', kind: 'Boar', need: 3, coins: 12, rep: 1, xp: 15,
    name: 'Кабанья напасть', desc: 'Три кабана. Роют поля у города и кидаются на телеги.' },
  meat: { giver: 'guild', rank: 'G-', repeat: true, type: 'item', item: 'meatCooked', need: 5, coins: 14, rep: 1, xp: 12,
    name: 'Мясо для таверны', desc: 'Пять кусков жареного мяса. Жарить на костре.' },
  herbs: { giver: 'guild', rank: 'G-', repeat: true, type: 'item', item: 'herbs', need: 4, coins: 12, rep: 1, xp: 12,
    name: 'Травы для лекаря', desc: 'Четыре пучка целебной травы.' },
  spikers: { giver: 'guild', rank: 'G', repeat: true, type: 'kill', kind: 'Spiker', need: 3, coins: 24, rep: 2, xp: 30,
    name: 'Шипогрызы у тракта', desc: 'Три шипогрыза. Купцы жалуются: скотину режут прямо на обочине.' },
  rawmeat: { giver: 'guild', rank: 'G', repeat: true, type: 'item', item: 'meatRaw', need: 8, coins: 18, rep: 2, xp: 16,
    name: 'Сырое мясо для псарни', desc: 'Восемь кусков сырого мяса. Псарня гильдии кормит гончих.' },
  jumpers: { giver: 'guild', rank: 'G+', repeat: true, type: 'kill', kind: 'Jumper', need: 2, coins: 36, rep: 3, xp: 45,
    name: 'Костяные прыгуны', desc: 'Два прыгуна. Опасны: бьют силой при прыжке и приземлении.' },
  throwers: { giver: 'guild', rank: 'G+', repeat: true, type: 'kill', kind: 'Thrower', need: 2, coins: 40, rep: 3, xp: 50,
    name: 'Метатели в угодьях', desc: 'Два метателя. Стреляют шипами, держись сбоку.' },
  crystals: { giver: 'guild', rank: 'G+', repeat: true, type: 'item', item: 'crystals', need: 6, coins: 50, rep: 3, xp: 40,
    name: 'Кристаллы для гильдии', desc: 'Шесть кристаллов зверей. Платят щедро и без вопросов.' },
  groveMix: { giver: 'guild', rank: 'F-', repeat: true, type: 'kill', kinds: ['Jumper', 'Thrower'], scene: 'grove', need: 5, coins: 75, rep: 4, xp: 90,
    name: 'Чистка рощи', desc: 'Пять прыгунов или метателей в Дальней роще. Роща за угодьями, пускают с ранга F-.' },
  crystalsBig: { giver: 'guild', rank: 'F', repeat: true, type: 'item', item: 'crystals', need: 14, coins: 130, rep: 5, xp: 100,
    name: 'Партия кристаллов', desc: 'Четырнадцать кристаллов для городской мастерской.' },
  marshSpikers: { giver: 'guild', rank: 'E-', repeat: true, type: 'kill', kind: 'Spiker', scene: 'marsh', need: 5, coins: 160, rep: 7, xp: 170,
    name: 'Болотные шипогрызы', desc: 'Пять шипогрызов на Гнилых болотах. Там они крупнее и злее.' },

  // ---- Гильдия, особые ----
  letter: { giver: 'guild', rank: 'G', type: 'find', target: 'carter', coins: 15, rep: 2, xp: 20,
    name: 'Письмо для Ждана', desc: 'Отнести письмо извозчику Ждану на стоянку за воротами и вернуться.' },
  wreck: { giver: 'guild', rank: 'G+', type: 'find', target: 'wreck', coins: 45, rep: 4, xp: 50,
    name: 'Пропавший обоз', desc: 'В угодьях пропала телега с грузом. Найти обломки и принести груз.' },
  den: { giver: 'guild', rank: 'F-', type: 'kill', tag: 'den', need: 5, coins: 85, rep: 5, xp: 110,
    name: 'Логово шипогрызов', desc: 'Пятеро шипогрызов устроили логово в глубине угодий. Выжечь гнездо.',
    spawn: { scene: 'hunt', list: [[76, 26], [78, 30], [74, 32], [80, 27], [77, 34]], kind: 'spiker', lvl: 5 } },
  alphaJumper: { giver: 'guild', rank: 'F', type: 'kill', tag: 'alphaJumper', need: 1, coins: 150, rep: 7, xp: 180,
    name: 'Вожак прыгунов', desc: 'Огромный прыгун водит стаю в Дальней роще. Голова вожака — гильдии.',
    spawn: { scene: 'grove', list: [[62, 12]], kind: 'bigJumper', lvl: 8 } },
  alphaThrower: { giver: 'guild', rank: 'F+', type: 'kill', tag: 'alphaThrower', need: 1, coins: 170, rep: 7, xp: 190,
    name: 'Вожак метателей', desc: 'Старый метатель с иглами в палец толщиной. Держит южную опушку рощи.',
    spawn: { scene: 'grove', list: [[40, 32]], kind: 'thrower', lvl: 10 } },
  ironhide: { giver: 'guild', rank: 'E-', type: 'kill', tag: 'ironhide', need: 1, coins: 260, rep: 10, xp: 260,
    name: 'Железношкур', desc: 'Шипогрыз с бронёй как у кабана-старца. На болотах разорвал троих охотников.',
    spawn: { scene: 'marsh', list: [[60, 22]], kind: 'spiker', lvl: 12 } },
  ambush: { giver: 'guild', rank: 'E', type: 'kill', tag: 'ambush', need: 6, coins: 320, rep: 12, xp: 300,
    name: 'Засада на тракте', desc: 'Стая зверей силы подстерегает обозы на тракте. Шесть голов.',
    spawn: { scene: 'road', list: [[60, 22], [64, 26], [70, 25], [74, 22], [66, 20], [58, 26]], kind: 'mixed', lvl: 9 } },
  marshQueen: { giver: 'guild', rank: 'E+', type: 'kill', tag: 'marshQueen', need: 1, coins: 480, rep: 15, xp: 420,
    name: 'Хозяйка болот', desc: 'Самый большой прыгун, которого видели в этих краях. Вожаки рощи — её выводок.',
    spawn: { scene: 'marsh', list: [[36, 14]], kind: 'bigJumper', lvl: 14 } },

  // ---- Хутор ----
  field: { giver: 'village', rank: 'G-', repeat: true, type: 'kill', kind: 'Boar', scene: 'village', need: 4, coins: 10, rep: 1, xp: 15,
    name: 'Кабаны в поле', desc: 'Кабаны снова роют поле за хутором. Четыре головы.' },
  well: { giver: 'village', rank: 'G', type: 'item', item: 'herbs', need: 5, coins: 22, rep: 2, xp: 25,
    name: 'Отравленный колодец', desc: 'Вода в колодце горчит. Знахарка просит пять пучков целебной травы на отвар.' },
  goat: { giver: 'village', rank: 'G-', type: 'find', target: 'goat', coins: 12, rep: 1, xp: 15,
    name: 'Пропавшая коза', desc: 'Коза сбежала к тракту. Найти и привести назад.' },
};
