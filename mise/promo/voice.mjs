// Озвучка ролика через Google AI Studio (Gemini TTS). Ключ в коде не хранится:
// задайте GEMINI_API_KEY в окружении или сохраните его как сетевой секрет (заголовок x-goog-api-key).
// Результат: promo/voice/line-N.wav, voice/voice.wav (все реплики подряд) и voice/timing.json (длительности сцен).
import fs from 'node:fs';
const LINES = [
  'Привет! Я шеф Моти.',
  'Не знаешь, что приготовить?',
  'Просто выбери, что есть в холодильнике.',
  'Яблоко, яйца, и всё остальное.',
  'Я сразу подберу блюдо из твоих продуктов.',
  'А хочешь удивиться? Нажми «Удиви меня»!',
  'Готовь по шагам. Таймер запускается одним нажатием.',
  'Mise. Готовь без лишних слов.',
];
const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const VOICE = process.env.GEMINI_VOICE || 'Kore';
const STYLE = 'Говори по-русски тепло, дружелюбно и бодро, как весёлый шеф-повар в рекламном ролике: ';
const SR = 24000;
fs.mkdirSync('promo/voice', { recursive: true });
const wav = (pcm) => { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40); return Buffer.concat([h, pcm]); };
const pcms = [];
for (const [i, text] of LINES.entries()) {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.GEMINI_API_KEY) headers['x-goog-api-key'] = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, { method: 'POST', headers, body: JSON.stringify({ contents: [{ parts: [{ text: STYLE + text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } }) });
  if (!res.ok) { console.error(`Строка ${i + 1}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`); process.exit(1); }
  const part = (await res.json()).candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) { console.error(`Строка ${i + 1}: в ответе нет аудио`); process.exit(1); }
  const pcm = Buffer.from(part.inlineData.data, 'base64'); pcms.push(pcm);
  fs.writeFileSync(`promo/voice/line-${i + 1}.wav`, wav(pcm)); console.log(`line ${i + 1}: ${(pcm.length / 2 / SR).toFixed(2)} s`);
}
// каждая сцена длится реплика + пауза; в ролике реплики звучат подряд с этими паузами
const GAP = 0.45; const dur = pcms.map((p) => p.length / 2 / SR + GAP);
fs.writeFileSync('promo/voice/timing.json', JSON.stringify(dur.map((d) => Math.round(d * 100) / 100)));
const gap = Buffer.alloc(Math.round(GAP * SR) * 2);
fs.writeFileSync('promo/voice/voice.wav', wav(Buffer.concat(pcms.flatMap((p) => [p, gap]))));
console.log('Готово: promo/voice/voice.wav и timing.json. Теперь пересоберите ролик: node promo/make-motion.cjs');
