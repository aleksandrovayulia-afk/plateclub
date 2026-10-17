/* Tiny QR encoder (byte mode, versions 1–10, error level M) — enough for an invite link.
   No dependency, ~90 lines: builds the matrix and returns an SVG string. */
const QR_EC = { 1: 10, 2: 16, 3: 26, 4: 18, 5: 24, 6: 16, 7: 18, 8: 22, 9: 22, 10: 26 };     // EC codewords per block, level M
const QR_BLOCKS = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4, 7: 4, 8: 4, 9: 5, 10: 5 };
const QR_TOTAL = { 1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172, 7: 196, 8: 242, 9: 292, 10: 346 };
const QR_ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

const gfExp = new Uint8Array(512), gfLog = new Uint8Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { gfExp[i] = x; gfLog[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) gfExp[i] = gfExp[i - 255]; })();
const gfMul = (a, b) => (a && b ? gfExp[gfLog[a] + gfLog[b]] : 0);

function rsGen(n) { let p = [1]; for (let i = 0; i < n; i++) { const q = [...p, 0]; for (let j = 0; j < p.length; j++) q[j + 1] ^= gfMul(p[j], gfExp[i]); p = q; } return p; }
function rsEncode(data, n) {
  const gen = rsGen(n), res = new Uint8Array(n);
  for (const d of data) { const f = d ^ res[0]; res.copyWithin(0, 1); res[n - 1] = 0; for (let i = 0; i < n; i++) res[i] ^= gfMul(gen[i + 1], f); }
  return res;
}

function qrSvg(text, { scale = 8, quiet = 3 } = {}) {
  const bytes = new TextEncoder().encode(text);
  let ver = 0;
  for (let v = 1; v <= 10; v++) {
    const cap = QR_TOTAL[v] - QR_EC[v] * QR_BLOCKS[v];
    if (bytes.length + (v < 10 ? 2 : 3) <= cap) { ver = v; break; }
  }
  if (!ver) return '';
  const total = QR_TOTAL[ver], nb = QR_BLOCKS[ver], ecc = QR_EC[ver], dataLen = total - ecc * nb;

  // bit stream: mode 0100, length, payload, terminator, padding
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  for (let i = 0; i < 4 && bits.length < dataLen * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  const PAD = [0xec, 0x11]; let pi = 0; while (data.length < dataLen) data.push(PAD[pi++ % 2]);

  // split into blocks, interleave with their EC words
  const short = Math.floor(dataLen / nb), extra = dataLen % nb;
  const blocks = []; let off = 0;
  for (let i = 0; i < nb; i++) { const len = short + (i >= nb - extra ? 1 : 0); const d = data.slice(off, off + len); off += len; blocks.push({ d, e: rsEncode(d, ecc) }); }
  const out = [];
  for (let i = 0; i < short + 1; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < ecc; i++) for (const b of blocks) out.push(b.e[i]);

  // matrix
  const size = ver * 4 + 17;
  const m = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const setF = (r, c, v) => { if (r >= 0 && r < size && c >= 0 && c < size) m[r][c] = v; };
  const finder = (r, c) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) { const v = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6)) || (i >= 2 && i <= 4 && j >= 2 && j <= 4) ? 1 : 0; setF(r + i, c + j, v); } };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { m[6][i] = i % 2 ? 0 : 1; m[i][6] = i % 2 ? 0 : 1; }
  for (const a of QR_ALIGN[ver]) for (const b of QR_ALIGN[ver]) {
    if ((a === 6 && b === 6) || (a === 6 && b === size - 7) || (a === size - 7 && b === 6)) continue;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) setF(a + i, b + j, Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0);
  }
  setF(size - 8, 8, 1);
  // reserve format areas
  for (let i = 0; i < 9; i++) { if (m[8][i] === -1) m[8][i] = 0; if (m[i][8] === -1) m[i][8] = 0; }
  for (let i = 0; i < 8; i++) { if (m[8][size - 1 - i] === -1) m[8][size - 1 - i] = 0; if (m[size - 1 - i][8] === -1) m[size - 1 - i][8] = 0; }

  // place data, mask 0 ((r+c)%2===0)
  let bi = 0; const bitAt = k => (out[k >> 3] >> (7 - (k & 7))) & 1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let k = 0; k < size; k++) {
      const row = ((size - 1 - col) >> 1) % 2 === 0 ? size - 1 - k : k;
      for (const c of [col, col - 1]) {
        if (m[row][c] !== -1) continue;
        let v = bi < out.length * 8 ? bitAt(bi++) : 0;
        if ((row + c) % 2 === 0) v ^= 1;
        m[row][c] = v;
      }
    }
  }
  // format info for level M + mask 0
  const fmt = 0x5412 ^ 0; const FMT = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0][0];
  for (let i = 0; i < 15; i++) {
    const b = (FMT >> i) & 1;
    if (i < 6) m[i][8] = b; else if (i < 8) m[i + 1][8] = b; else if (i === 8) m[8][7] = b; else m[8][14 - i] = b;
    if (i < 8) m[8][size - 1 - i] = b; else m[size - 15 + i][8] = b;
  }
  const dim = size + quiet * 2, px = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c] === 1) px.push(`M${c + quiet} ${r + quiet}h1v1h-1z`);
  return `<svg viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${px.join('')}" fill="#040507"/></svg>`;
}
