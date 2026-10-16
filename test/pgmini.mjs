// Minimal Postgres wire-protocol client for local tests only (trust auth, simple query protocol).
// Implements the subset of the pg.Pool API the app uses: pool.query, pool.connect -> client.query/release.
import net from 'node:net';

const lit = v => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const subst = (text, params) => text.replace(/\$(\d+)/g, (_, i) => lit(params[Number(i) - 1]));

class Conn {
  constructor(opts) { this.opts = opts; this.buf = Buffer.alloc(0); this.waiters = []; }
  connect() {
    return new Promise((res, rej) => {
      this.sock = net.connect(this.opts.port, this.opts.host, () => {
        const params = Buffer.from(`user\0${this.opts.user}\0database\0${this.opts.database}\0client_encoding\0UTF8\0\0`);
        const len = Buffer.alloc(8); len.writeInt32BE(8 + params.length, 0); len.writeInt32BE(196608, 4);
        this.sock.write(Buffer.concat([len, params]));
      });
      this.sock.on('data', d => { this.buf = Buffer.concat([this.buf, d]); this.pump(); });
      this.sock.on('error', rej);
      this.cur = { rows: [], fields: [], done: (e) => e ? rej(e) : res(this), err: null };
    });
  }
  pump() {
    while (this.buf.length >= 5) {
      const type = String.fromCharCode(this.buf[0]); const len = this.buf.readInt32BE(1);
      if (this.buf.length < len + 1) return;
      const body = this.buf.subarray(5, len + 1); this.buf = this.buf.subarray(len + 1);
      const c = this.cur;
      if (type === 'T') { const nf = body.readInt16BE(0); let o = 2; c.fields = []; for (let i = 0; i < nf; i++) { const e = body.indexOf(0, o); c.fields.push(body.toString('utf8', o, e)); o = e + 1 + 18; } }
      else if (type === 'D') { const nc = body.readInt16BE(0); let o = 2; const row = {}; for (let i = 0; i < nc; i++) { const l = body.readInt32BE(o); o += 4; row[c.fields[i]] = l < 0 ? null : body.toString('utf8', o, o + l); if (l > 0) o += l; } c.rows.push(row); }
      else if (type === 'C') { const m = body.toString('utf8', 0, body.length - 1).match(/(\d+)$/); c.rowCount = m ? Number(m[1]) : 0; }
      else if (type === 'E') { const f = {}; let o = 0; while (body[o]) { const k = String.fromCharCode(body[o]); const e = body.indexOf(0, o + 1); f[k] = body.toString('utf8', o + 1, e); o = e + 1; } const err = new Error(f.M); err.code = f.C; err.constraint = f.n; err.detail = f.D; c.err = err; }
      else if (type === 'Z') { const cb = c.done; this.cur = null; cb(c.err, c); this.next(); }
    }
  }
  next() { if (this.cur || !this.waiters.length) return; const w = this.waiters.shift(); this.cur = { rows: [], fields: [], err: null, done: w.done }; const sql = Buffer.from(w.sql + '\0'); const h = Buffer.alloc(5); h.write('Q'); h.writeInt32BE(4 + sql.length, 1); this.sock.write(Buffer.concat([h, sql])); }
  query(text, params = []) {
    return new Promise((res, rej) => { this.waiters.push({ sql: subst(text, params), done: (e, c) => e ? rej(e) : res({ rows: c.rows, rowCount: c.rowCount }) }); this.next(); });
  }
  release() { this.sock.end(); }
}
export function createPool(opts) {
  return {
    async connect() { const c = new Conn(opts); await c.connect(); return c; },
    async query(t, p) { const c = await this.connect(); try { return await c.query(t, p); } finally { c.release(); } },
  };
}
