import fs from 'node:fs';
import path from 'node:path';
import ru from '../js/i18n/ru.js';
import en from '../js/i18n/en.js';
import es from '../js/i18n/es.js';

const dicts = { ru, en, es };
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!/i18n|data|test/.test(f.name) || f.name === 'views') walk(p); } else if (p.endsWith('.js') && !p.endsWith('i18n.js')) files.push(p); } })('js');
const used = new Set(); const dyn = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*`([^`]+)`/g)) (m[1].includes('${') ? dyn : used).add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*[^'`)][^)]*\)/g)) void m;
}
let bad = 0;
for (const k of used) for (const l of Object.keys(dicts)) if (!(k in dicts[l])) { console.log(`MISSING ${l}: ${k}`); bad++; }
for (const k of new Set([...Object.keys(ru), ...Object.keys(en), ...Object.keys(es)])) for (const l of Object.keys(dicts)) {
  if (!(k in dicts[l])) { console.log(`PARITY ${l}: ${k}`); bad++; }
  else if (Array.isArray(ru[k]) !== Array.isArray(dicts[l][k])) { console.log(`PLURAL-SHAPE ${l}: ${k}`); bad++; }
}
console.log('dynamic key templates (check manually):', [...dyn].join(' | '));
console.log(`${used.size} static keys, ${bad} problems`);
process.exit(bad ? 1 : 0);
