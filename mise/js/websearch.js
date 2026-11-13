// Онлайн-поиск. Ничего не выдумывает: возвращает только то, что реально пришло из сети.
// Источники: TheMealDB (рецепты), Wikipedia (справка о продуктах и блюдах) и, по желанию пользователя, собственный адрес поиска.
// Секретных ключей здесь нет. Если у пользователя свой сервис, он указывает его адрес в настройках, ключи хранятся на стороне сервиса.
import * as store from './store.js';

const TIMEOUT = 8000;
const WIKI = { ru: 'ru', en: 'en', es: 'es' };

export const online = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

async function getJson(url, signal, init = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  const onAbort = () => ctl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
}

const clean = (s, n = 280) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };

async function mealDb(q, signal) {
  const d = await getJson(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`, signal);
  return (d.meals || []).slice(0, 4).map((m) => {
    const ings = [];
    for (let i = 1; i <= 20; i++) if (m[`strIngredient${i}`]?.trim()) ings.push(`${m[`strIngredient${i}`].trim()}${m[`strMeasure${i}`]?.trim() ? ` (${m[`strMeasure${i}`].trim()})` : ''}`);
    return { kind: 'recipe', source: 'TheMealDB', title: m.strMeal, snippet: clean(`${m.strCategory || ''}${m.strArea ? ` · ${m.strArea}` : ''}. ${ings.slice(0, 8).join(', ')}`), url: safeUrl(m.strSource) || safeUrl(m.strYoutube) || `https://www.themealdb.com/meal/${m.idMeal}`, img: safeUrl(m.strMealThumb) };
  });
}

async function wiki(q, lang, signal) {
  const l = WIKI[lang] || 'en';
  const d = await getJson(`https://${l}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=extracts|info&exintro=1&explaintext=1&exchars=300&inprop=url`, signal);
  return Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index).map((p) => ({ kind: 'article', source: `Wikipedia (${l})`, title: p.title, snippet: clean(p.extract), url: safeUrl(p.fullurl) }));
}

async function custom(q, lang, signal) {
  const url = safeUrl(store.get().searchEndpoint);
  if (!url) return [];
  const d = await getJson(url, signal, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, lang }) });
  return (Array.isArray(d.results) ? d.results : []).slice(0, 5).map((x) => ({ kind: 'article', source: new URL(url).hostname, title: clean(x.title, 120), snippet: clean(x.snippet), url: safeUrl(x.url) })).filter((x) => x.title);
}

/**
 * Ищет в интернете. Возвращает { ok, items, errors, offline }.
 * ok=false, если ни один источник не ответил. Пустой список при ok=true означает «ничего не найдено».
 */
export async function searchOnline(q, lang, { signal, wantRecipes = true } = {}) {
  if (!online()) return { ok: false, offline: true, items: [], errors: ['offline'] };
  const jobs = [wiki(q, lang, signal)];
  if (safeUrl(store.get().searchEndpoint)) jobs.unshift(custom(q, lang, signal));
  if (wantRecipes) jobs.push(mealDb(q, signal));
  const res = await Promise.allSettled(jobs);
  if (signal?.aborted) return { ok: false, aborted: true, items: [], errors: [] };
  const items = []; const errors = [];
  res.forEach((r) => (r.status === 'fulfilled' ? items.push(...r.value) : errors.push(String(r.reason?.message || r.reason))));
  // «ничего не найдено» говорим, только если все источники ответили; иначе честно сообщаем о сбое
  return { ok: items.length > 0 || errors.length === 0, items, errors };
}
