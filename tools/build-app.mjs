// Concatenates src/*.js into public/app.js (one ES module, no bundler needed).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../src/', import.meta.url);
const out = readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');
writeFileSync(new URL('../public/app.js', import.meta.url), out);
console.log('app.js', out.length);
