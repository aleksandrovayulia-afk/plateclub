// PLATE CLUB — game specification v2 (single source of truth for server and client).
// Russian plates: А777АА 777. Belarusian plates: 1234 AB-7 (4 digits, 2 Latin letters, region 1–7).
import { randomInt } from 'node:crypto';

export const LETTERS = 'АВЕКМНОРСТУХ';
export const BY_LETTERS = 'ABEIKMHOPCTX';
export const GROUPS = { msk: 'Москва', spb: 'Санкт-Петербург', mo: 'Подмосковье', south: 'Юг', ural: 'Урал и Поволжье', sib: 'Сибирь и Дальний Восток', west: 'Калининград', by: 'Беларусь' };
export const REGIONS = {
  '77': ['Москва', 'msk'], '97': ['Москва', 'msk'], '99': ['Москва', 'msk'], '177': ['Москва', 'msk'], '777': ['Москва', 'msk'], '797': ['Москва', 'msk'],
  '78': ['Санкт-Петербург', 'spb'], '98': ['Санкт-Петербург', 'spb'], '178': ['Санкт-Петербург', 'spb'],
  '50': ['Московская обл.', 'mo'], '90': ['Московская обл.', 'mo'], '150': ['Московская обл.', 'mo'],
  '23': ['Краснодарский край', 'south'], '93': ['Краснодарский край', 'south'], '123': ['Краснодарский край', 'south'], '61': ['Ростовская обл.', 'south'], '161': ['Ростовская обл.', 'south'], '01': ['Адыгея', 'south'],
  '66': ['Свердловская обл.', 'ural'], '96': ['Свердловская обл.', 'ural'], '74': ['Челябинская обл.', 'ural'], '174': ['Челябинская обл.', 'ural'], '02': ['Башкортостан', 'ural'], '16': ['Татарстан', 'ural'], '116': ['Татарстан', 'ural'], '63': ['Самарская обл.', 'ural'], '52': ['Нижегородская обл.', 'ural'],
  '54': ['Новосибирская обл.', 'sib'], '154': ['Новосибирская обл.', 'sib'], '24': ['Красноярский край', 'sib'], '124': ['Красноярский край', 'sib'], '38': ['Иркутская обл.', 'sib'], '42': ['Кемеровская обл.', 'sib'], '25': ['Приморский край', 'sib'],
  '39': ['Калининградская обл.', 'west'],
};
export const BY_REGIONS_EN = { '1': 'Brest region', '2': 'Vitebsk region', '3': 'Gomel region', '4': 'Grodno region', '5': 'Minsk region', '6': 'Mogilev region', '7': 'Minsk' };
export const BY_REGIONS = { '1': 'Брестская обл.', '2': 'Витебская обл.', '3': 'Гомельская обл.', '4': 'Гродненская обл.', '5': 'Минская обл.', '6': 'Могилёвская обл.', '7': 'Минск' };
export const ALLREG = Object.keys(REGIONS);
export const ALLBY = Object.keys(BY_REGIONS);
export const GROUP_MULT = { msk: 1.35, spb: 1.2 };
export const BY_MULT = 0.6; // Belarusian combinations are cheaper
export const TIERS = [
  { id: 'common', name: 'Обычный', base: 25 },
  { id: 'fine', name: 'Хороший', base: 80 },
  { id: 'rare', name: 'Редкий', base: 500 },
  { id: 'elite', name: 'Элитный', base: 2500 },
  { id: 'grail', name: 'Грааль', base: 15000 },
];
// Value versions. A plate keeps the version it was minted with (plates.vv), so a sealed value never changes.
// v1 — launch; v2 (16 Oct 2026) — rare plates worth much more; v3 (16 Oct 2026) — higher common/fine bases + plate traits.
export const VALUE_V = 4;
const BASES = { 1: { common: 20, fine: 60, rare: 220, elite: 900, grail: 6000 }, 2: { common: 20, fine: 60, rare: 500, elite: 2500, grail: 15000 } };
export const TI = Object.fromEntries(TIERS.map((t, i) => [t.id, i]));
export const PATS = { common: ['random'], fine: ['seq', 'pair'], rare: ['mirror', 'round'], elite: ['triple', 'zero', 'letters'], grail: ['full', 'zerofull'] };
export const PAT_NAME = { random: 'Обычный', seq: 'Лесенка', pair: 'Пара', mirror: 'Зеркальный', round: 'Круглый', triple: 'Одинаковые цифры', zero: 'Нулевая серия', letters: 'Одинаковые буквы', full: 'Полное совпадение', zerofull: 'Ноль + буквы' };

export const SIGNUP_BONUS = 100;
export const MARKET_FEE = 0.05;
export const BANK_RATE = 0.6;
export const STARTER_PRICE = 100;

// odds: [common, fine, rare, elite, grail] — mostly "fine", rare plates are rare.
// v3 odds (16 Oct 2026): better drops everywhere; the priciest «Элита» cases got +3 p.p. of Grail.
const O = {
  starter: [60, 36, 3.5, 0.45, 0.05],
  cheap: [40, 42, 16, 1.9, 0.1],
  cheap2: [34, 44, 19, 2.6, 0.4],
  mid: [28, 46, 22, 3.4, 0.6],
  pattern: [22, 46, 27, 4.4, 0.6],
  premium: [4, 36, 40, 17, 3],
  top: [0, 22, 48, 24, 6],
  legend: [0, 8, 48, 35, 9],
  royal: [0, 4, 46, 38, 12],
  mythic: [0, 0, 46, 40, 14],
  apex: [0, 0, 30, 48, 22],
  elite: [0, 0, 0, 59, 41],
  crown: [0, 0, 0, 42, 58],
  by: [22, 46, 28, 3.6, 0.4], // Belarus: nice combinations show up more often, but each is worth less
};
// Share of the average plate value a case pays back. Cheap cases pay back the most, so small wins are frequent.
export const RTP = { season: 0.97, start: 0.93, region: 0.92, belarus: 0.92, pattern: 0.9, premium: 0.9, top: 0.88, legend: 0.87, elite: 0.85 };
const RU = (g) => ({ country: 'RU', group: g });
const BY = (regs) => ({ country: 'BY', regions: regs });
const MIX = { country: 'MIX' };
const P = (letters, digits, region, country = 'RU') => ({ letters, digits, region, country });
const RAW = [
  // Старт
  { id: '01', en: 'First case. Plates from all of Russia.', ru: 'Старт', name: 'Starter', cat: 'start', color: '#C9D3E0', color2: '#6B7A90', odds: O.starter, pool: RU(), note: 'Первый кейс. Номера со всей России.', cover: P('ТХМ', '482', '66') },
  { id: '02', en: 'Russia and Belarus mixed.', ru: 'Попутчик', name: 'Commuter', cat: 'start', color: '#9AA6FF', color2: '#3A3F8F', odds: O.cheap, pool: MIX, note: 'Россия и Беларусь вперемешку.', cover: P('KA', '4821', '7', 'BY') },
  { id: '03', en: 'A few more sequences and pairs.', ru: 'Каждый день', name: 'Daily Driver', cat: 'start', color: '#B8F2E6', color2: '#3C8D93', odds: O.cheap2, pool: RU(), note: 'Чуть больше лесенок и пар.', cover: P('РСО', '215', '54') },
  { id: '04', en: 'A light weekend case.', ru: 'Выходные', name: 'Weekend', cat: 'start', color: '#FFD6A5', color2: '#C7703A', odds: O.cheap2, pool: MIX, note: 'Лёгкий кейс на выходные.', cover: P('ЕВС', '305', '23') },
  // Регионы России
  { id: '05', en: 'Moscow only: 77, 97, 99, 177, 777, 797.', ru: 'Столица', name: 'Capital', cat: 'region', color: '#FF3D57', color2: '#7A0019', odds: O.mid, pool: RU('msk'), note: 'Только Москва: 77, 97, 99, 177, 777, 797.', cover: P('НКВ', '790', '77') },
  { id: '06', en: 'Saint Petersburg: 78, 98, 178.', ru: 'Нева', name: 'Neva', cat: 'region', color: '#3DD6FF', color2: '#1238A8', odds: O.mid, pool: RU('spb'), note: 'Петербург: 78, 98, 178.', cover: P('ВСЕ', '178', '78') },
  { id: '07', en: 'Moscow region: 50, 90, 150.', ru: 'Подмосковье', name: 'Podmoskovye', cat: 'region', color: '#9DFF6B', color2: '#1F7A4A', odds: O.mid, pool: RU('mo'), note: 'Московская область: 50, 90, 150.', cover: P('ОМК', '450', '50') },
  { id: '08', en: 'Krasnodar, Rostov, Adygea.', ru: 'Юг', name: 'South', cat: 'region', color: '#FF9F43', color2: '#B3261E', odds: O.mid, pool: RU('south'), note: 'Краснодар, Ростов, Адыгея.', cover: P('ОТК', '323', '23') },
  { id: '09', en: 'From Yekaterinburg to Kazan.', ru: 'Урал и Волга', name: 'Ural & Volga', cat: 'region', color: '#B57CFF', color2: '#3B1E8F', odds: O.mid, pool: RU('ural'), note: 'От Екатеринбурга до Казани.', cover: P('ЕРУ', '196', '96') },
  { id: '10', en: 'From Novosibirsk to Vladivostok.', ru: 'Сибирь', name: 'Siberia', cat: 'region', color: '#7CF7E8', color2: '#155E75', odds: O.mid, pool: RU('sib'), note: 'От Новосибирска до Владивостока.', cover: P('МВХ', '540', '154') },
  { id: '11', en: 'Kaliningrad only, code 39.', ru: 'Балтика', name: 'Baltic', cat: 'region', color: '#7AA2FF', color2: '#20307A', odds: O.mid, pool: RU('west'), note: 'Только Калининград, код 39.', cover: P('АКТ', '239', '39') },
  // Беларусь
  { id: '12', en: 'Minsk, region 7. Belarus is cheaper — nice combinations are easier to get.', ru: 'Минск', name: 'Minsk', cat: 'belarus', color: '#FF4D6D', color2: '#00A651', odds: O.by, pool: BY(['7']), note: 'Минск, регион 7. Беларусь дешевле — красивые комбинации доступнее.', cover: P('MK', '7070', '7', 'BY') },
  { id: '13', en: 'Brest region, 1.', ru: 'Брест', name: 'Brest', cat: 'belarus', color: '#5CF2A8', color2: '#0B6E4F', odds: O.by, pool: BY(['1']), note: 'Брестская область, регион 1.', cover: P('AB', '1001', '1', 'BY') },
  { id: '14', en: 'Vitebsk region, 2.', ru: 'Витебск', name: 'Vitebsk', cat: 'belarus', color: '#5BC0FF', color2: '#173E8C', odds: O.by, pool: BY(['2']), note: 'Витебская область, регион 2.', cover: P('HC', '2468', '2', 'BY') },
  { id: '15', en: 'Gomel region, 3.', ru: 'Гомель', name: 'Gomel', cat: 'belarus', color: '#FFD23F', color2: '#B65E00', odds: O.by, pool: BY(['3']), note: 'Гомельская область, регион 3.', cover: P('OE', '3003', '3', 'BY') },
  { id: '16', en: 'Grodno region, 4.', ru: 'Гродно', name: 'Grodno', cat: 'belarus', color: '#D59BFF', color2: '#5B2A8C', odds: O.by, pool: BY(['4']), note: 'Гродненская область, регион 4.', cover: P('TX', '4141', '4', 'BY') },
  { id: '17', en: 'Mogilev region, 6.', ru: 'Могилёв', name: 'Mogilev', cat: 'belarus', color: '#C6FF3D', color2: '#3C7A00', odds: O.by, pool: BY(['6']), note: 'Могилёвская область, регион 6.', cover: P('PI', '6006', '6', 'BY') },
  { id: '18', en: 'All regions of Belarus.', ru: 'Беларусь микс', name: 'Belarus Mix', cat: 'belarus', color: '#F2F2F2', color2: '#C8102E', odds: O.cheap2, pool: BY(ALLBY), note: 'Все регионы Беларуси.', cover: P('AA', '1234', '5', 'BY') },
  // Узоры
  { id: '19', en: 'Fine tier is always a sequence: 123, 456, 987.', ru: 'Лесенка', name: 'Sequence', cat: 'pattern', color: '#2EF2B8', color2: '#0D6B6B', odds: O.pattern, focus: { fine: 'seq' }, pool: RU(), note: 'Хороший тир — всегда лесенка: 123, 456, 987.', cover: P('АВС', '123', '123') },
  { id: '20', en: 'Fine tier is always a pair: 113, 900…', ru: 'Пара', name: 'Pair', cat: 'pattern', color: '#FF8A5B', color2: '#8A1E3B', odds: O.pattern, focus: { fine: 'pair' }, pool: RU(), note: 'Хороший тир — всегда пара: 113, 900…', cover: P('ВКМ', '113', '16') },
  { id: '21', en: 'Rare tier is always a mirror: 808, 121.', ru: 'Зеркало', name: 'Mirror', cat: 'pattern', color: '#9BE7FF', color2: '#4A5BD4', odds: O.pattern, focus: { rare: 'mirror' }, pool: RU(), note: 'Редкий тир — всегда зеркальный номер: 808, 121.', cover: P('НОН', '808', '78') },
  { id: '22', en: 'Rare tier is always a round hundred.', ru: 'Круглые', name: 'Round', cat: 'pattern', color: '#FFE66D', color2: '#B07D00', odds: O.pattern, focus: { rare: 'round' }, pool: RU(), note: 'Редкий тир — всегда круглая сотня.', cover: P('КСТ', '500', '50') },
  { id: '23', en: 'Elite tier is always three equal digits.', ru: 'Тройка', name: 'Triple', cat: 'pattern', color: '#FF5FB0', color2: '#6A1B9A', odds: O.pattern, focus: { elite: 'triple' }, pool: RU(), note: 'Элитный тир — всегда три одинаковые цифры.', cover: P('ЕКТ', '888', '116') },
  { id: '24', en: 'Elite tier is always three equal letters.', ru: 'Буквы', name: 'Letters', cat: 'pattern', color: '#A78BFA', color2: '#312E81', odds: O.pattern, focus: { elite: 'letters' }, pool: RU(), note: 'Элитный тир — всегда три одинаковые буквы.', cover: P('МММ', '314', '02') },
  { id: '25', en: 'Plates 001–009.', ru: 'Ноль', name: 'Zero', cat: 'pattern', color: '#EEF2F7', color2: '#5B6676', odds: O.pattern, focus: { elite: 'zero', grail: 'zerofull' }, pool: RU(), note: 'Номера 001–009.', cover: P('ОТР', '007', '39') },
  { id: '26', en: 'Belarus: sequences 1234, 9876.', ru: 'Лесенка BY', name: 'BY Sequence', cat: 'pattern', color: '#3EE6C1', color2: '#164E63', odds: O.pattern, focus: { fine: 'seq' }, pool: BY(ALLBY), note: 'Беларусь: лесенка 1234, 9876.', cover: P('KI', '1234', '7', 'BY') },
  { id: '27', en: 'Belarus: mirrors 1221, 4554.', ru: 'Зеркало BY', name: 'BY Mirror', cat: 'pattern', color: '#7AB8FF', color2: '#1E3A8A', odds: O.pattern, focus: { rare: 'mirror' }, pool: BY(ALLBY), note: 'Беларусь: зеркальные 1221, 4554.', cover: P('MM', '1221', '1', 'BY') },
  { id: '28', en: 'Belarus: elite tier is always four equal digits, 7777.', ru: 'Четвёрка', name: 'Quad', cat: 'pattern', color: '#FFD25E', color2: '#9A3412', odds: O.pattern, focus: { elite: 'triple' }, pool: BY(ALLBY), note: 'Беларусь: элитный тир — четыре одинаковые цифры, 7777.', cover: P('AX', '7777', '7', 'BY') },
  // Премиум
  { id: '29', en: 'Russia and Belarus, no budget plates at the top.', ru: 'Граница', name: 'Border', cat: 'premium', color: '#C0C7D6', color2: '#3F4756', odds: O.premium, pool: MIX, note: 'Россия и Беларусь, без бюджетных номеров в топе.', cover: P('ОАО', '100', '177') },
  { id: '30', en: 'The night case: more rare plates.', ru: 'Полночь', name: 'Midnight', cat: 'premium', color: '#4B6BFF', color2: '#0B0F3A', odds: O.premium, pool: RU(), note: 'Ночной кейс: больше редких номеров.', cover: P('ССС', '303', '99') },
  { id: '31', en: 'Moscow in chrome.', ru: 'Хром', name: 'Chrome', cat: 'premium', color: '#E6F0FF', color2: '#7D8AA3', odds: O.premium, pool: RU('msk'), note: 'Москва в хроме.', cover: P('ХКМ', '001', '797') },
  { id: '32', en: 'Minsk with boosted odds.', ru: 'Неоновый Минск', name: 'Neon Minsk', cat: 'premium', color: '#FF3DF2', color2: '#2E1065', odds: O.premium, pool: BY(['7']), note: 'Минск с повышенными шансами.', cover: P('EE', '0007', '7', 'BY') },
  { id: '33', en: 'Elite tier is always three equal letters.', ru: 'Чёрный', name: 'Black', cat: 'premium', color: '#5A5F6B', color2: '#0A0B0E', odds: O.premium, focus: { elite: 'letters' }, pool: RU(), note: 'Элитный тир — три одинаковые буквы.', cover: P('ВВВ', '505', '77') },
  { id: '34', en: 'Round numbers from both countries.', ru: 'Золотая лихорадка', name: 'Gold Rush', cat: 'premium', color: '#FFC83D', color2: '#7C4A03', odds: O.premium, focus: { rare: 'round' }, pool: MIX, note: 'Круглые номера двух стран.', cover: P('OO', '5000', '5', 'BY') },
  // Топ
  { id: '35', en: 'No common plates at all.', ru: 'Сейф', name: 'Vault', cat: 'top', color: '#9FFFE0', color2: '#0F5C4C', odds: O.top, pool: MIX, note: 'Без обычных номеров вообще.', cover: P('ААА', '010', '777') },
  { id: '36', en: 'Moscow only, no common plates.', ru: 'Чёрная столица', name: 'Capital Black', cat: 'top', color: '#FF4D4D', color2: '#1A0A0A', odds: O.top, pool: RU('msk'), note: 'Только Москва, без обычных номеров.', cover: P('ХКМ', '001', '77') },
  { id: '37', en: 'Belarus only, no common plates.', ru: 'Золото Беларуси', name: 'Belarus Gold', cat: 'top', color: '#FFE08A', color2: '#8C5A00', odds: O.top, pool: BY(ALLBY), note: 'Только Беларусь, без обычных номеров.', cover: P('AA', '7777', '7', 'BY') },
  { id: '38', en: 'No commons, 7% Grail chance.', ru: 'Грааль', name: 'Grail', cat: 'top', color: '#FFB020', color2: '#5C1A00', odds: [0, 20, 48, 25, 7], pool: RU(), note: 'Без обычных и с шансом Грааля 7%.', cover: P('ААА', '777', '777') },
  // Легенды — самые дорогие, с самыми щедрыми шансами
  { id: '39', en: 'Russia and Belarus. Rare or better — 80%.', ru: 'Обсидиан', name: 'Obsidian', cat: 'legend', color: '#8B7CFF', color2: '#120B2E', odds: O.legend, pool: MIX, note: 'Россия и Беларусь. Редкий и выше — 80%.', cover: P('ОХО', '070', '777') },
  { id: '40', en: 'Elite is always three equal digits, Grail is a full match.', ru: 'Семёрка', name: 'Seven', cat: 'legend', color: '#2DD4BF', color2: '#064E3B', odds: O.legend, focus: { elite: 'triple', grail: 'full' }, pool: RU(), note: 'Элитный — всегда три одинаковые цифры, Грааль — полное совпадение.', cover: P('ВВВ', '777', '77') },
  { id: '41', en: 'Moscow. Almost every second plate is Elite or Grail.', ru: 'Платиновая Москва', name: 'Platinum Moscow', cat: 'legend', color: '#F1F5F9', color2: '#64748B', odds: O.royal, pool: RU('msk'), note: 'Москва. Элитный и Грааль — почти каждый второй.', cover: P('АМР', '001', '77') },
  { id: '42', en: 'Minsk with no commons or fines: rare and better only.', ru: 'Королевский Минск', name: 'Minsk Royal', cat: 'legend', color: '#FF2E63', color2: '#3B0A1E', odds: O.mythic, pool: BY(['7']), note: 'Минск без обычных и хороших: только редкий и выше.', cover: P('AA', '0001', '7', 'BY') },
  { id: '43', en: 'Rare and better only, 12% Grail.', ru: 'Бриллиант', name: 'Diamond', cat: 'legend', color: '#7DD3FC', color2: '#1E1B4B', odds: O.mythic, pool: RU(), note: 'Только редкий и выше, Грааль — 12%.', cover: P('ЕЕЕ', '100', '199') },
  { id: '44', en: 'The most generous legend: 20% Grail.', ru: 'Вершина', name: 'Apex', cat: 'legend', color: '#FF7A00', color2: '#3A0CA3', odds: O.apex, pool: MIX, note: 'Самый щедрый из легенд: Грааль — 20%.', cover: P('ААА', '001', '777') },
  // Элита — только элитные номера и Граали, в 2–3 раза дороже всего остального
  { id: '45', ru: 'Из грязи в князи', en: 'Only Elite and Grail plates. From rags to riches.', name: 'Rags to Riches', cat: 'elite', color: '#FFB800', color2: '#5A3A00', odds: O.elite, pool: RU(), note: 'Только элитные номера и Граали. Из грязи — в князи.', cover: P('ККК', '777', '77') },
  { id: '46', ru: 'Элита Москвы', en: 'Moscow, Elite and Grail only.', name: 'Moscow Elite', cat: 'elite', color: '#FF4D8D', color2: '#3A0018', odds: O.elite, pool: RU('msk'), note: 'Москва, только элитные и Граали.', cover: P('ААА', '001', '777') },
  { id: '47', ru: 'Элита Беларуси', en: 'Belarus, Elite and Grail only.', name: 'Belarus Elite', cat: 'elite', color: '#7CFFB2', color2: '#003D1F', odds: O.elite, pool: BY(ALLBY), note: 'Беларусь, только элитные и Граали.', cover: P('AA', '7777', '7', 'BY') },
  { id: '48', ru: 'Элитная элита', en: 'The elite of elites: Grail drops more often than Elite.', name: 'Elite of Elites', cat: 'elite', color: '#E9D5FF', color2: '#2E1065', odds: O.crown, pool: MIX, note: 'Элита среди элиты: Грааль выпадает чаще элитного.', cover: P('ААА', '777', '777') },
  // Сезон (до 1 ноября 2026)
  { id: 'S1', en: 'Autumn season — better odds, only until Nov 1.', ru: 'Осенний сезон', name: 'Autumn Season', cat: 'season', color: '#FFB347', color2: '#B4361E', odds: [10, 40, 38, 10, 2], pool: RU(), note: 'Сезонный кейс: шансы на редкие выше обычного. Продаётся только до 1 ноября.', cover: P('ООО', '777', '77'), until: Date.UTC(2026, 10, 1) },
];
export const CATS = { season: 'Сезон', start: 'Старт', region: 'Регионы России', belarus: 'Беларусь', pattern: 'Узоры', premium: 'Премиум', top: 'Топ', legend: 'Легенды', elite: 'Элита' };
// Case rarity by price — every case gets its own badge besides its own colour.
export const caseRank = price => (price <= 150 ? 'common' : price <= 400 ? 'fine' : price <= 1200 ? 'rare' : price <= 3000 ? 'elite' : 'grail');

export const poolRegions = c => {
  const p = c.pool || RU();
  if (p.country === 'BY') return { RU: [], BY: p.regions };
  if (p.country === 'MIX') return { RU: ALLREG, BY: ALLBY };
  return { RU: p.group ? ALLREG.filter(r => REGIONS[r][1] === p.group) : ALLREG, BY: [] };
};
export const poolOf = c => poolRegions(c).RU;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
export const regMult = (r, country = 'RU') => country === 'BY' ? BY_MULT : (GROUP_MULT[REGIONS[r] && REGIONS[r][1]] || 1);

// ---- daily deals: three cases at 5–10% off, the same for everyone, changing at 00:00 UTC ----
export function dealsFor(ts = Date.now()) {
  const day = Math.floor(ts / 86400000);
  let s = (day * 2654435761) >>> 0; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const ids = CASES.filter(c => c.id !== '01').map(c => c.id); const out = [];
  while (out.length < 3) { const id = ids[Math.floor(r() * ids.length)]; if (!out.find(d => d.id === id)) out.push({ id, pct: [5, 7, 10][out.length] }); }
  const ends = (day + 1) * 86400000;
  return out.map(d => { const c = caseById(d.id); return { ...d, price: Math.round(c.price * (1 - d.pct / 100)), was: c.price, ends }; });
}
export const priceNow = (c, ts = Date.now()) => { const d = dealsFor(ts).find(x => x.id === c.id); return d ? d.price : c.price; };

// ---------- plate generation (server uses crypto RNG) ----------
const rnd = () => randomInt(0, 1_000_000) / 1_000_000;
const ri = (a, b) => randomInt(a, b + 1);
const pick = a => a[randomInt(0, a.length)];
const isSeq = d => { const a = [...d].map(Number); return a.every((v, i) => i === 0 || v - a[i - 1] === 1) || a.every((v, i) => i === 0 || a[i - 1] - v === 1); };
const allSame = d => [...d].every(ch => ch === d[0]);
function specialRU(d) { return d === '000' || allSame(d) || d.startsWith('00') || (d[0] === d[2] && d[0] !== d[1]) || d.slice(1) === '00' || isSeq(d) || d[0] === d[1] || d[1] === d[2]; }
function specialBY(d) { return d === '0000' || allSame(d) || d.startsWith('000') || (d[0] === d[3] && d[1] === d[2]) || d.slice(1) === '000' || isSeq(d) || (d[0] === d[1] && d[2] === d[3]) || d.slice(0, 2) === d.slice(2); }
function digitsRU(k) {
  if (k === 'triple') { const d = ri(1, 9); return `${d}${d}${d}`; }
  if (k === 'zero') return '00' + ri(1, 9);
  if (k === 'mirror') { const a = ri(1, 9); let b; do b = ri(0, 9); while (b === a); return `${a}${b}${a}`; }
  if (k === 'round') return ri(1, 9) + '00';
  if (k === 'seq') { if (rnd() < 0.6) { const s = ri(1, 7); return `${s}${s + 1}${s + 2}`; } const s = ri(3, 9); return `${s}${s - 1}${s - 2}`; }
  if (k === 'pair') { let d; do { const a = ri(1, 9); let b; do b = ri(0, 9); while (b === a); d = rnd() < 0.5 ? `${a}${a}${b}` : `${a}${b}${b}`; } while (isSeq(d)); return d; }
  let d; do d = String(ri(1, 999)).padStart(3, '0'); while (specialRU(d)); return d;
}
function digitsBY(k) {
  if (k === 'triple') { const d = ri(1, 9); return `${d}${d}${d}${d}`; }
  if (k === 'zero') return '000' + ri(1, 9);
  if (k === 'mirror') { const a = ri(1, 9); let b; do b = ri(0, 9); while (b === a); return `${a}${b}${b}${a}`; }
  if (k === 'round') return ri(1, 9) + '000';
  if (k === 'seq') { if (rnd() < 0.6) { const s = ri(1, 6); return `${s}${s + 1}${s + 2}${s + 3}`; } const s = ri(4, 9); return `${s}${s - 1}${s - 2}${s - 3}`; }
  if (k === 'pair') { let d; do { const a = ri(1, 9); let b; do b = ri(0, 9); while (b === a); d = rnd() < 0.5 ? `${a}${a}${b}${b}` : `${a}${b}${a}${b}`; } while (isSeq(d)); return d; }
  let d; do d = String(ri(1, 9999)).padStart(4, '0'); while (specialBY(d)); return d;
}
function lettersOf(country, same) {
  const L = country === 'BY' ? BY_LETTERS : LETTERS, n = country === 'BY' ? 2 : 3;
  if (same) { const l = pick(L); return l.repeat(n); }
  let s; do s = Array.from({ length: n }, () => pick(L)).join(''); while (allSame(s)); return s;
}
export function genPlate(tier, pool, focus) {
  // pool: { RU: [...regions], BY: [...regions] } or an array of RU regions
  const pr = Array.isArray(pool) ? { RU: pool, BY: [] } : (pool || { RU: ALLREG, BY: [] });
  const country = pr.RU.length && pr.BY.length ? (rnd() < 0.5 ? 'RU' : 'BY') : pr.BY.length ? 'BY' : 'RU';
  const pat = (focus && focus[tier]) || pick(PATS[tier]);
  const D = { random: 'random', seq: 'seq', pair: 'pair', mirror: 'mirror', round: 'round', triple: 'triple', zero: 'zero', letters: 'random', full: 'triple', zerofull: 'zero' }[pat];
  const same = pat === 'letters' || pat === 'full' || pat === 'zerofull';
  return { country, letters: lettersOf(country, same), digits: country === 'BY' ? digitsBY(D) : digitsRU(D), region: pick(country === 'BY' ? pr.BY : pr.RU), tier, pattern: pat };
}
// ---- plate traits (value v3): small things collectors pay extra for ----
export const BLAT = ['АМР', 'ЕКХ', 'ВОР', 'КМР', 'АКР', 'ХКХ', 'МОР', 'ОКО', 'СОС', 'ТОТ'];
export const TRAITS = {
  // mult = values v1–v3 (kept so old plates still verify); m4 = v4: beautiful plates are worth much more
  blat: { name: 'Блатная серия', en: 'VIP series', mult: 2, m4: 3.5 },
  low: { name: 'Низкий номер', en: 'Low number', mult: 1.5, m4: 2.2 },
  sevens: { name: 'Две семёрки', en: 'Double seven', mult: 1.3, m4: 1.8 },
  pairL: { name: 'Парные буквы', en: 'Paired letters', mult: 1.3, m4: 1.7 },
  allSeven: { name: 'Все семёрки', en: 'All sevens', mult: 1.5, m4: 3 },
  first: { name: 'Номер один', en: 'Number one', mult: 1.4, m4: 3 },
};
const digitTraits = (d, country) => {
  const t = [];
  if (/^7+$/.test(d)) t.push('allSeven');
  else if ((d.match(/7/g) || []).length >= 2) t.push('sevens');
  if (/^0+1$/.test(d)) t.push('first');
  else if (d && !/^0+[1-9]$/.test(d) && Number(d) < (country === 'BY' ? 1000 : 100)) t.push('low');
  return t;
};
const letterTraits = (l, country) => {
  if (!l || country === 'BY' || allSame(l)) return [];
  if (BLAT.includes(l)) return ['blat'];
  return new Set(l).size === 2 ? ['pairL'] : [];
};
export function plateTraits(p) {
  const vv = p.vv || VALUE_V, country = p.country || 'RU';
  if (vv < 3) return [/^7+$/.test(p.digits) && 'allSeven', /^0+1$/.test(p.digits) && 'first'].filter(Boolean);
  return [...digitTraits(p.digits, country), ...letterTraits(p.letters, country)];
}
const traitMult = (ts, vv = VALUE_V) => ts.reduce((m, t) => m * (vv >= 4 ? TRAITS[t].m4 : TRAITS[t].mult), 1);
export function plateValue(p) {
  const vv = p.vv || VALUE_V;
  const base = BASES[vv] ? BASES[vv][p.tier] : TIERS[TI[p.tier]].base;
  return Math.round(base * regMult(p.region, p.country || 'RU') * traitMult(plateTraits({ ...p, vv }), vv));
}
// Exact average trait multiplier of a tier (enumerates every digit/letter combination the generator can produce).
const DSETS = {};
function digitSet(kind, country) {
  const k = kind + country; if (DSETS[k]) return DSETS[k];
  const n = country === 'BY' ? 4 : 3, out = [];
  for (let i = 0; i < 10 ** n; i++) {
    const d = String(i).padStart(n, '0'), a = [...d], nz = d[0] !== '0';
    const ok = {
      random: i > 0 && !(country === 'BY' ? specialBY(d) : specialRU(d)),
      seq: isSeq(d) && (country === 'BY' ? /^(1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321)$/ : /^(123|234|345|456|567|678|789|987|876|765|654|543|432|321)$/).test(d),
      pair: nz && !isSeq(d) && (country === 'BY' ? ((a[0] === a[1] && a[2] === a[3] && a[0] !== a[2]) || (a[0] === a[2] && a[1] === a[3] && a[0] !== a[1])) : ((a[0] === a[1]) !== (a[1] === a[2]))),
      mirror: nz && (country === 'BY' ? a[0] === a[3] && a[1] === a[2] && a[0] !== a[1] : a[0] === a[2] && a[0] !== a[1]),
      round: new RegExp('^[1-9]0{' + (n - 1) + '}$').test(d),
      triple: nz && allSame(d),
      zero: new RegExp('^0{' + (n - 1) + '}[1-9]$').test(d),
    }[kind];
    if (ok) out.push(d);
  }
  return (DSETS[k] = out);
}
const LM = {};
const lmean = vv => LM[vv] || (LM[vv] = (() => { let s = 0, c = 0; for (const x of LETTERS) for (const y of LETTERS) for (const z of LETTERS) { const l = x + y + z; if (allSame(l)) continue; s += traitMult(letterTraits(l, 'RU'), vv); c++; } return s / c; })());
const TF = {};
export function tierFactor(tier, country, focus, vv = VALUE_V) {
  const pats = focus && focus[tier] ? [focus[tier]] : PATS[tier];
  const key = tier + country + pats.join() + vv;
  if (TF[key]) return TF[key];
  const D = { random: 'random', seq: 'seq', pair: 'pair', mirror: 'mirror', round: 'round', triple: 'triple', zero: 'zero', letters: 'random', full: 'triple', zerofull: 'zero' };
  return (TF[key] = mean(pats.map(pat => {
    const ds = digitSet(D[pat], country); const dm = mean(ds.map(d => traitMult(digitTraits(d, country), vv)));
    const same = pat === 'letters' || pat === 'full' || pat === 'zerofull';
    return dm * (same || country === 'BY' ? 1 : lmean(vv));
  })));
}
// v4 bases: plain plates a little cheaper, beautiful ones much dearer — the average per tier (and case prices) stay as in v3
BASES[4] = Object.fromEntries(TIERS.map(t => [t.id, Math.round(t.base * tierFactor(t.id, 'RU', null, 3) / tierFactor(t.id, 'RU', null, 4) * 10) / 10]));
export const tierBase = id => (BASES[VALUE_V] ? BASES[VALUE_V][id] : TIERS[TI[id]].base);
export const CASES = RAW.map(c => {
  const pr = poolRegions(c);
  const parts = [...(pr.RU.length ? [mean(pr.RU.map(r => regMult(r)))] : []), ...(pr.BY.length ? [BY_MULT] : [])];
  const mult = mean(parts);
  const countries = [...(pr.RU.length ? ['RU'] : []), ...(pr.BY.length ? ['BY'] : [])];
  const ev = c.odds.reduce((a, o, i) => a + (o / 100) * tierBase(TIERS[i].id) * mean(countries.map(k => (k === 'BY' ? BY_MULT : mean(pr.RU.map(r => regMult(r)))) * tierFactor(TIERS[i].id, k, c.focus))), 0);
  const price = c.id === '01' ? STARTER_PRICE : Math.max(110, Math.round(ev / RTP[c.cat] / 10) * 10);
  const topIdx = c.odds.findLastIndex(o => o > 0);
  return { ...c, mult: Math.round(mult * 1000) / 1000, ev: Math.round(ev), price, rank: caseRank(price), cover: { ...c.cover, tier: TIERS[topIdx].id } };
});
export const caseById = id => CASES.find(c => c.id === id);

export function drawTier(odds) {
  const total = odds.reduce((a, b) => a + b, 0);
  let x = (randomInt(0, 1_000_000) / 1_000_000) * total;
  for (let i = 0; i < odds.length; i++) { if (x < odds[i]) return TIERS[i].id; x -= odds[i]; }
  return TIERS[odds.findLastIndex(o => o > 0)].id;
}
export const comboKey = p => (p.country === 'BY' ? 'BY:' + p.digits + p.letters + '-' + p.region : p.letters[0] + p.digits + p.letters.slice(1) + '|' + p.region);
export const plateStr = p => (p.country === 'BY' ? `${p.digits} ${p.letters}-${p.region}` : `${p.letters[0]}${p.digits}${p.letters.slice(1)} ${p.region}`);
export const regionName = p => (p.country === 'BY' ? BY_REGIONS[p.region] : (REGIONS[p.region] || [''])[0]);

export const PACKAGES = [
  { id: 'plt100', plt: 100, price: { EUR: 100, USD: 110, GBP: 90 } },
  { id: 'plt250', plt: 250, price: { EUR: 250, USD: 275, GBP: 220 } },
  { id: 'plt500', plt: 500, price: { EUR: 500, USD: 550, GBP: 450 } },
  { id: 'plt1200', plt: 1200, price: { EUR: 1100, USD: 1200, GBP: 950 }, tag: '+9%' },
  { id: 'plt3000', plt: 3000, price: { EUR: 2500, USD: 2750, GBP: 2200 }, tag: '+20%' },
  { id: 'plt7500', plt: 7500, price: { EUR: 5900, USD: 6500, GBP: 5200 }, tag: '+27%' },
  { id: 'plt20000', plt: 20000, price: { EUR: 14900, USD: 16500, GBP: 12900 }, tag: '+34%' },
];

// ---- perks ----
// Daily bonus: once per UTC day; a streak of consecutive days raises it, up to 7 days.
export const DAILY = { base: 10, step: 0, maxStreak: 5 };
// streak ladder: day 1 → 10, day 2 → 20, day 3 → 50, day 4 → 75, day 5 and on → 100. Missing a day starts over.
export const DAILY_LADDER = [10, 20, 50, 75, 100];
export const dailyLadder = (base = 10) => DAILY_LADDER.map(v => Math.round(v * base / 10));
export const dailyAmount = (streak, base = 10) => dailyLadder(base)[Math.min(Math.max(streak, 1), DAILY_LADDER.length) - 1];
// Achievements: the server checks the condition from real data before paying the reward (once per account).
export const ACHIEVEMENTS = [
  { id: 'first', name: 'Первый номер', text: 'Откройте первый кейс.', reward: 10, ok: s => s.opened >= 1 },
  { id: 'ten', name: 'Десятка', text: 'Соберите 10 номеров.', reward: 40, ok: s => s.plates >= 10 },
  { id: 'opener', name: 'Азарт', text: 'Откройте 25 кейсов.', reward: 100, ok: s => s.opened >= 25 },
  { id: 'rare', name: 'Редкая находка', text: 'Получите редкий номер или лучше.', reward: 100, ok: s => s.maxtier >= 2 },
  { id: 'elite', name: 'Элита', text: 'Получите элитный номер.', reward: 200, ok: s => s.maxtier >= 3 },
  { id: 'grail', name: 'Грааль', text: 'Получите номер-Грааль.', reward: 250, ok: s => s.maxtier >= 4 },
  { id: 'regions', name: 'Путешественник', text: 'Номера из 5 регионов.', reward: 75, ok: s => s.regions >= 5 },
  { id: 'belarus', name: 'Две страны', text: 'Соберите номера России и Беларуси.', reward: 75, ok: s => s.countries >= 2 },
  { id: 'buyer', name: 'Первая покупка', text: 'Купите номер на рынке.', reward: 20, ok: s => s.bought >= 1 },
  { id: 'lister', name: 'Продавец', text: 'Выставите номер на рынок.', reward: 20, ok: s => s.listed >= 1 },
  { id: 'seller', name: 'Первая продажа', text: 'Продайте номер другому игроку.', reward: 50, ok: s => s.sold >= 1 },
  { id: 'twin', name: 'Близнецы', text: 'Получите номер «2 из 2» — последний экземпляр комбинации.', reward: 150, ok: s => s.twins >= 1 },
];
export const CURRENCIES = ['EUR', 'USD', 'GBP'];

// ---- runtime settings the admin can change from the control panel (stored in the settings table) ----
export const SETTINGS_DEFAULT = { signupBonus: SIGNUP_BONUS, dailyBonus: 10, bankRate: BANK_RATE, marketFee: MARKET_FEE, dealerRate: 1.15, dealerPerDay: 3, botSize: 60, announcement: '', cases: {} };
export const SETTINGS_LIMITS = { signupBonus: [0, 100000, 1], dailyBonus: [0, 100000, 1], bankRate: [0, 0.95, 0.01], marketFee: [0, 0.3, 0.005], dealerRate: [0.5, 2, 0.01], dealerPerDay: [0, 50, 1], botSize: [0, 200, 1] };
export function cleanSettings(raw = {}) {
  const out = { ...SETTINGS_DEFAULT, cases: {} };
  for (const [k, [lo, hi, step]] of Object.entries(SETTINGS_LIMITS)) {
    const v = Number(raw[k]); if (raw[k] === undefined || raw[k] === null || raw[k] === '' || !Number.isFinite(v)) continue;
    out[k] = Math.min(hi, Math.max(lo, step >= 1 ? Math.round(v) : Math.round(v / step) * step));
    if (step < 1) out[k] = Math.round(out[k] * 1000) / 1000;
  }
  out.announcement = String(raw.announcement || '').slice(0, 280);
  for (const [id, c] of Object.entries(raw.cases || {})) {
    if (!caseById(id) || !c) continue; const o = {};
    if (c.hidden) o.hidden = true;
    const pr = Number(c.price); if (Number.isInteger(pr) && pr >= 1 && pr <= 10000000) o.price = pr;
    if (Object.keys(o).length) out.cases[id] = o;
  }
  return out;
}
export const caseBasePrice = (c, st = SETTINGS_DEFAULT) => (st.cases[c.id] && st.cases[c.id].price) || c.price;
export function casePrice(c, st = SETTINGS_DEFAULT, ts = Date.now()) {
  const d = dealsFor(ts).find(x => x.id === c.id); const base = caseBasePrice(c, st);
  return d ? Math.round(base * (1 - d.pct / 100)) : base;
}
export function publicConfig(env = {}, ts = Date.now(), st = SETTINGS_DEFAULT) {
  const stripe = !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
  return { wheel: WHEEL.map(({ id, kind, amount, tier }) => ({ id, kind, amount: amount || 0, tier: tier || null })), season: SEASON, referral: { friend: REFERRAL.friend, inviter: REFERRAL.inviter, signupInviter: REFERRAL.signupInviter, signupFriend: REFERRAL.signupFriend, needOpens: REFERRAL.needOpens, milestones: REFERRAL.milestones }, quests: { story: QUESTS.story.reward, tiktokPerView: QUESTS.tiktok.perView, tiktokMax: QUESTS.tiktok.maxPerVideo }, telegram: { url: env.TELEGRAM_URL || TELEGRAM.url, reward: TELEGRAM.reward },
    announcement: st.announcement || '',
    letters: LETTERS, byLetters: BY_LETTERS, maxCopies: 2, levels: { step: LEVEL_STEP, reward: LEVEL_REWARD }, groupMult: GROUP_MULT, byMult: BY_MULT, upgrade: { edge: UPGRADE_EDGE, max: UPGRADE_MAX, min: UPGRADE_MIN, maxPlates: UPGRADE_MAX_PLATES }, daily: { ...DAILY, base: st.dailyBonus, ladder: dailyLadder(st.dailyBonus) }, sets: SET_PUBLIC, battle: { seats: BATTLE.seats, maxRounds: BATTLE.maxRounds }, battleCases: BATTLE_CASES.map(({ id, ru, en, name, cat, color, color2, odds, note, cover, mult, ev, price, rank, pool }) => ({ id, ru, en, name, cat, color, color2, odds, note, cover, focus: null, mult, ev, price, rank, pool: poolRegions({ pool }) })), traits: TRAITS, dealer: { rate: st.dealerRate, perDay: st.dealerPerDay, tiers: DEALER.tiers }, botNick: MARKET_BOT.nick, achievements: ACHIEVEMENTS.map(({ ok, ...a }) => a), groups: GROUPS, regions: REGIONS, byRegions: BY_REGIONS, tiers: TIERS.map(t => ({ ...t, base: tierBase(t.id) })), patNames: PAT_NAME, cats: CATS,
    cases: CASES.filter(c => !(st.cases[c.id] && st.cases[c.id].hidden) && !(c.until && ts > c.until)).map(({ id, ru, en, name, cat, color, color2, odds, note, cover, focus, mult, ev, price, rank, pool, until }) => ({ id, ru, en, name, cat, color, color2, odds, note, cover, until: until || null, focus: focus || null, mult, ev, price: caseBasePrice({ id, price }, st), rank, pool: poolRegions({ pool }) })),
    deals: dealsFor(ts).filter(d => !(st.cases[d.id] && st.cases[d.id].hidden)).map(d => ({ ...d, was: caseBasePrice(caseById(d.id), st), price: casePrice(caseById(d.id), st, ts) })),
    fee: st.marketFee, bankRate: st.bankRate, signupBonus: st.signupBonus,
    mail: !!(env.RESEND_API_KEY && env.MAIL_FROM),
    payments: {
      currencies: CURRENCIES, packages: PACKAGES,
      methods: stripe ? [{ id: 'card', name: 'Банковская карта', provider: 'Stripe Checkout', fee: 'Plate Club не берёт комиссию. Банк может взять плату за конвертацию.' }] : [],
      crypto: [],
    },
  };
}

// ---- player levels: XP = PLT spent on cases. Level n needs 50·(n−1)·n XP. Every new level: 10 PLT. ----
export const LEVEL_STEP = 50, LEVEL_REWARD = 10;
// slow curve: XP = PLT spent on cases. Level 10 ≈ 31k, 25 ≈ 300k, 50 ≈ 1.5M (wow), 100 ≈ 7.8M (legend).
export const xpFor = lvl => (lvl <= 1 ? 0 : Math.round(200 * Math.pow(lvl - 1, 2.3)));
export const LEVEL_TITLES = [[100, 'legend'], [75, 'tycoon'], [50, 'star'], [25, 'expert'], [10, 'collector'], [1, 'rookie']];
export const levelTitle = l => LEVEL_TITLES.find(([min]) => l >= min)[1];
// medals for big activity (besides the TOP-10 / TOP-3 ranking medals)
export const TELEGRAM = { url: 'https://t.me/+pMbT6m8-iuM2YjFk', reward: 500 };
// invite a friend: both sides get PLT once the friend has really started playing
// Invite a friend. The friend gets a welcome bonus, the inviter is paid once that friend
// really starts playing. Milestones reward the people who bring a whole crowd.
export const REFERRAL = {
  signupInviter: 1000,   // paid to the inviter the moment the friend registers
  signupFriend: 500,     // extra welcome for a friend who came by a link
  inviter: 2000,         // paid to the inviter once the friend really plays
  friend: 500,           // and to the friend at the same moment
  needOpens: 3, maxPerDay: 20,
  milestones: [[3, 3000], [10, 10000], [25, 30000], [50, 75000], [100, 200000]],
};
export const refMilestone = n => REFERRAL.milestones.filter(([k]) => k <= n);
export const refNext = n => REFERRAL.milestones.find(([k]) => k > n) || null;
// social quests checked by an admin
export const QUESTS = { story: { reward: 5000, cooldownDays: 30 }, tiktok: { perView: 1, maxPerVideo: 50000 } };
export const MEDAL_RULES = { trader: 50, spender: 100000, earner: 50000, lv50: 50, lv100: 100 };
export function levelOf(xp) { let l = 1; while (l < 999 && xpFor(l + 1) <= xp) l++; return { level: l, xp, cur: xpFor(l), next: xpFor(l + 1), title: levelTitle(l) }; }

// ---- upgrade: trade one plate for a chance at a higher tier in the same region ----
export const UPGRADE_EDGE = 0.9, UPGRADE_MAX = 0.75, UPGRADE_MIN = 0.01;
export const targetValue = (p, tier) => plateValue({ tier, region: p.region, country: p.country, digits: '' });
export const UPGRADE_MAX_PLATES = 2;
export const upgradeChance = (valueIn, valueTarget) => Math.max(UPGRADE_MIN, Math.min(UPGRADE_MAX, Math.floor(UPGRADE_EDGE * valueIn / valueTarget * 10000) / 10000));

// ---- market ecosystem (v9) ----
// Market maker: the "Plate Club Market" account keeps the market stocked with fresh everyday plates.
// Prices scatter around the estimate: some lots are bargains, and unsold lots get cheaper over time (down to a floor).
export const MARKET_BOT = { nick: 'PlateClubMarket', size: 60, tierOdds: [38, 32, 19, 9, 2] };
export const BOT_DECAY = { minutes: 30, step: 0.94, floor: 0.82 };
export function botPriceFactor(r1, r2) {
  if (r1 < 0.25) return 0.84 + r2 * 0.1; // bargain: 84–94% of the estimate
  if (r1 < 0.8) return 0.97 + r2 * 0.2; // fair: 97–117%
  return 1.2 + r2 * 0.25; // pricey: 120–145%
}
export const botListPrice = (value, r1, r2) => Math.max(1, Math.round(value * botPriceFactor(r1, r2)));
// Dealer: every UTC day three kinds of plates are in demand. The dealer pays 115% of the estimate for them, up to 3 plates a day per player.
export const DEALER = { rate: 1.15, perDay: 3, tiers: ['common', 'fine'] };
const DEMANDS = [
  ...['msk', 'spb', 'mo', 'south', 'ural', 'sib', 'west'].map(g => ({ id: 'g-' + g, kind: 'group', key: g, ru: GROUPS[g], en: { msk: 'Moscow', spb: 'Saint Petersburg', mo: 'Moscow region', south: 'South', ural: 'Ural & Volga', sib: 'Siberia & Far East', west: 'Kaliningrad' }[g] })),
  { id: 'c-by', kind: 'country', key: 'BY', ru: 'Беларусь', en: 'Belarus' },
  { id: 'p-seq', kind: 'pattern', key: 'seq', ru: 'Лесенка', en: 'Sequence' },
  { id: 'p-pair', kind: 'pattern', key: 'pair', ru: 'Пара', en: 'Pair' },
  { id: 't-pairL', kind: 'trait', key: 'pairL', ru: 'Парные буквы', en: 'Paired letters' },
  { id: 't-low', kind: 'trait', key: 'low', ru: 'Низкий номер', en: 'Low number' },
  { id: 't-sevens', kind: 'trait', key: 'sevens', ru: 'Две семёрки', en: 'Double seven' },
  { id: 'r-common', kind: 'tier', key: 'common', ru: 'Любой обычный номер', en: 'Any common plate' },
];
export function dealerDemand(ts = Date.now()) {
  const day = Math.floor(ts / 86400000);
  let s = (day * 2246822519 + 7) >>> 0; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const out = [];
  while (out.length < 3) { const d = DEMANDS[Math.floor(r() * DEMANDS.length)]; if (!out.includes(d)) out.push(d); }
  return { day, ends: (day + 1) * 86400000, demands: out };
}
export function matchesDemand(p, d) {
  if (!DEALER.tiers.includes(p.tier)) return false;
  const country = p.country || 'RU';
  if (d.kind === 'group') return country === 'RU' && REGIONS[p.region] && REGIONS[p.region][1] === d.key;
  if (d.kind === 'country') return country === d.key;
  if (d.kind === 'pattern') return p.pattern === d.key;
  if (d.kind === 'trait') return plateTraits(p).includes(d.key);
  if (d.kind === 'tier') return p.tier === d.key;
  return false;
}
export const dealerPrice = p => Math.round(plateValue(p) * DEALER.rate);

// ---- collections (sets): own plates that fill every slot → a one-time reward and a badge ----
// slot matchers: reg (RU region codes), byreg (BY region), group, country, pat (pattern), trait, tier, tierMin, copy2, any
export function slotOk(p, m) {
  const c = p.country || 'RU';
  switch (m.k) {
    case 'reg': return c === 'RU' && m.v.includes(p.region);
    case 'byreg': return c === 'BY' && p.region === m.v;
    case 'group': return c === 'RU' && REGIONS[p.region] && REGIONS[p.region][1] === m.v;
    case 'country': return c === m.v;
    case 'pat': return p.pattern === m.v && (!m.c || c === m.c);
    case 'trait': return (Array.isArray(p.traits) ? p.traits : plateTraits(p)).includes(m.v);
    case 'tier': return p.tier === m.v;
    case 'tierMin': return TI[p.tier] >= TI[m.v];
    case 'copy2': return Number(p.copy) === 2;
    case 'any': return true;
    case 'and': return m.of.every(x => slotOk(p, x));
    default: return false;
  }
}
const S1 = (ru, en, m) => ({ ru, en, m });
const regSlots = g => [...new Set(Object.values(REGIONS).filter(r => r[1] === g).map(r => r[0]))].map(name => S1(name, name, { k: 'reg', v: Object.keys(REGIONS).filter(k => REGIONS[k][0] === name) }));
const times = (n, s) => Array.from({ length: n }, () => s);
// v12: only a few, very hard collections — for the best players.
const and = (...of) => ({ k: 'and', of });
export const SETS = [
  { id: 'moscow-elite', ru: 'Легенда Москвы', en: 'Moscow legend', badge: '77', color: '#FF3D57', reward: 25000, slots: ['77', '97', '99', '177', '777', '797'].map(r => S1(`${r} · элитный+`, `${r} · elite+`, and({ k: 'reg', v: [r] }, { k: 'tierMin', v: 'elite' }))) },
  { id: 'belarus-rare', ru: 'Беларусь в редких', en: 'Rare Belarus', badge: 'BY', color: '#5CF2A8', reward: 8000, slots: Object.entries(BY_REGIONS).map(([k, nm]) => S1(`${nm} · редкий+`, `${BY_REGIONS_EN[k]} · rare+`, and({ k: 'byreg', v: k }, { k: 'tierMin', v: 'rare' }))) },
  { id: 'grails', ru: 'Три Грааля', en: 'Three Grails', badge: 'G3', color: '#FFD700', reward: 30000, slots: times(3, S1('Грааль', 'Grail', { k: 'tier', v: 'grail' })) },
  { id: 'sevens', ru: 'Три топора', en: 'Triple sevens', badge: '777', color: '#2DD4BF', reward: 15000, slots: times(3, S1('Все семёрки', 'All sevens', { k: 'trait', v: 'allSeven' })) },
  { id: 'first', ru: 'Номер один', en: 'Number one', badge: '001', color: '#EEF2F7', reward: 12000, slots: times(2, S1('Номер 001', 'Number 001', { k: 'trait', v: 'first' })) },
  { id: 'blat', ru: 'Блатной кортеж', en: 'VIP motorcade', badge: 'АМР', color: '#FFC83D', reward: 10000, slots: times(5, S1('Блатная серия', 'VIP series', { k: 'trait', v: 'blat' })) },
  { id: 'patterns', ru: 'Все узоры', en: 'Every pattern', badge: '◆', color: '#B57CFF', reward: 20000, slots: ['seq', 'pair', 'mirror', 'round', 'triple', 'zero', 'letters', 'full', 'zerofull'].map(k => S1(PAT_NAME[k], k, { k: 'pat', v: k })) },
  { id: 'empire', ru: 'Империя', en: 'Empire', badge: '50', color: '#8B7CFF', reward: 40000, slots: times(50, S1('Редкий или лучше', 'Rare or better', { k: 'tierMin', v: 'rare' })) },
];
// Fill every slot with a distinct plate (most specific slots first). plates: owned plates.
export function setProgress(set, plates) {
  const order = set.slots.map((s, i) => ({ i, c: plates.filter(p => slotOk(p, s.m)).length })).sort((a, b) => a.c - b.c);
  const used = new Set(), filled = Array(set.slots.length).fill(null);
  for (const { i } of order) { const p = plates.filter(x => !used.has(x.id) && slotOk(x, set.slots[i].m)).sort((a, b) => a.value - b.value)[0]; if (p) { used.add(p.id); filled[i] = p.id; } }
  const have = filled.filter(Boolean).length;
  return { filled, have, need: set.slots.length, done: have === set.slots.length };
}
export const SET_PUBLIC = SETS.map(({ id, ru, en, badge, color, reward, slots }) => ({ id, ru, en, badge, color, reward, slots: slots.map(s => ({ ru: s.ru, en: s.en })) }));

// ---- case battle: 2–4 seats, 1–5 rounds of the same case; the biggest total value takes every plate ----
// v12: case battles use their own four cases (they are not sold in the catalogue).
const BATTLE_RAW = [
  { id: 'B1', ru: 'Дуэль', en: 'Quick battle case: everyday plates, one in four is rare.', name: 'Duel', cat: 'battle', color: '#7AB8FF', color2: '#0B2A5C', odds: [30, 46, 20, 3.5, 0.5], pool: MIX, note: 'Быстрый баттл: каждый четвёртый номер — редкий.', cover: P('ВВВ', '100', '77') },
  { id: 'B2', ru: 'Арена', en: 'Rare plates for every second player.', name: 'Arena', cat: 'battle', color: '#FF5FB0', color2: '#4A0E2E', odds: [0, 40, 45, 12, 3], pool: MIX, note: 'Редкий номер почти у каждого второго.', cover: P('ААА', '200', '199') },
  { id: 'B3', ru: 'Колизей', en: 'No common plates. Elite is common here.', name: 'Colosseum', cat: 'battle', color: '#FFB800', color2: '#4A2C00', odds: [0, 0, 55, 35, 10], pool: MIX, note: 'Без обычных и хороших: только редкие и выше.', cover: P('МММ', '777', '77') },
  { id: 'B4', ru: 'Олимп', en: 'Elite and Grail only. The biggest pots.', name: 'Olympus', cat: 'battle', color: '#E9D5FF', color2: '#2E1065', odds: [0, 0, 0, 55, 45], pool: MIX, note: 'Только элитные и Граали — самые большие банки.', cover: P('ООО', '001', '777') },
];
export const BATTLE_CASES = BATTLE_RAW.map(c => {
  const pr = poolRegions(c); const countries = [...(pr.RU.length ? ['RU'] : []), ...(pr.BY.length ? ['BY'] : [])];
  const ev = c.odds.reduce((a, o, i) => a + (o / 100) * tierBase(TIERS[i].id) * mean(countries.map(k => (k === 'BY' ? BY_MULT : mean(pr.RU.map(r => regMult(r)))) * tierFactor(TIERS[i].id, k, c.focus))), 0);
  const price = Math.max(110, Math.round(ev / 0.9 / 10) * 10);
  return { ...c, mult: 1, ev: Math.round(ev), price, rank: caseRank(price), cover: { ...c.cover, tier: TIERS[c.odds.findLastIndex(o => o > 0)].id } };
});
export const battleCaseById = id => BATTLE_CASES.find(c => c.id === id);
export const anyCaseById = id => caseById(id) || battleCaseById(id);
export const BATTLE = { seats: [2, 3, 4], maxRounds: 5, maxOpen: 3, botNames: ['Бот Шумахер', 'Бот Колян', 'Бот Нэо', 'Бот Майор', 'Бот Буба', 'Бот Таксист', 'Бот Гонщик', 'Бот Алиса'] };
// ---- auction of the day: one rare-or-better plate a day, ends at 00:00 UTC; a bid in the last 5 minutes adds 5 minutes ----
export const AUCTION = { tierOdds: [0, 0, 70, 25, 5], startK: 0.5, stepK: 0.05, minStep: 10, snipeMs: 5 * 60000 };
export const auctionDay = (ts = Date.now()) => Math.floor(ts / 86400000);
export const auctionMin = (a) => (a.topBid ? a.topBid + a.step : a.start);
// ---- swaps between players ----
export const SWAP = { maxPlates: 6, maxPending: 10 };

// ---- daily tasks: two per player per day, picked from this pool; progress is read from the ledger ----
export const DAILY_TASKS = [
  { id: 'open3', ru: 'Открой 3 кейса', en: 'Open 3 cases', need: 3, reward: 120, src: 'open' },
  { id: 'open6', ru: 'Открой 6 кейсов', en: 'Open 6 cases', need: 6, reward: 250, src: 'open' },
  { id: 'sell1', ru: 'Продай номер на рынке', en: 'Sell a plate on the market', need: 1, reward: 150, src: 'sell' },
  { id: 'buy1', ru: 'Купи номер на рынке', en: 'Buy a plate on the market', need: 1, reward: 150, src: 'buy' },
  { id: 'battle1', ru: 'Сыграй в кейс-баттл', en: 'Play a case battle', need: 1, reward: 200, src: 'battle' },
  { id: 'upgrade1', ru: 'Сделай апгрейд номера', en: 'Upgrade a plate', need: 1, reward: 150, src: 'upgrade' },
  { id: 'list1', ru: 'Выстави номер на продажу', en: 'List a plate for sale', need: 1, reward: 100, src: 'list' },
];
export function dailyTasksFor(userId, day) {
  // deterministic per player and day, always two different tasks
  let h = (Number(userId) * 2654435761 + day * 40503) >>> 0;
  const a = h % DAILY_TASKS.length; h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
  const rest = DAILY_TASKS.filter(t => t.src !== DAILY_TASKS[a].src);
  return [DAILY_TASKS[a], rest[h % rest.length]];
}

// ---- wheel of fortune: one free spin a day ----
export const WHEEL = [
  { id: 'c10', kind: 'plt', amount: 10, w: 26 },
  { id: 'c25', kind: 'plt', amount: 25, w: 22 },
  { id: 'c50', kind: 'plt', amount: 50, w: 17 },
  { id: 'c100', kind: 'plt', amount: 100, w: 12 },
  { id: 'pfine', kind: 'plate', tier: 'fine', w: 9 },
  { id: 'c250', kind: 'plt', amount: 250, w: 7 },
  { id: 'c500', kind: 'plt', amount: 500, w: 4 },
  { id: 'prare', kind: 'plate', tier: 'rare', w: 2.4 },
  { id: 'c2000', kind: 'plt', amount: 2000, w: 0.6 },
];

// ---- seasonal case: on sale only until the season ends ----
export const SEASON = { id: 'S1', ru: 'Осенний сезон', en: 'Autumn season', until: Date.UTC(2026, 10, 1, 0, 0, 0) };

// ---- game "Дороже или дешевле": guess whether the next plate is worth more or less ----
export const HILO = { runsPerDay: 5, steps: [5, 10, 20, 35, 55, 80, 110, 150, 200, 260], tierOdds: [34, 36, 22, 7, 1] };
