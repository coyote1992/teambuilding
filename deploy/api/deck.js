// Shared edits for the workshop deck, stored in Vercel Blob.
// Every save writes a new file fonte-viva-workshop/deck-<timestamp>.json;
// the newest file is the current state. Unique names avoid stale CDN copies.
import { put, list, del } from '@vercel/blob';

const PREFIX = 'fonte-viva-workshop/deck-';
const NAME = /^fonte-viva-workshop\/deck-(\d+)\.json$/;
const KEEP = 10;
const MAX_BYTES = 500000;

async function versions() {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const b of r.blobs) {
      const m = b.pathname.match(NAME);
      if (m) out.push({ v: m[1], url: b.url });
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => (BigInt(b.v) > BigInt(a.v) ? 1 : -1));
}

async function read(entry) {
  const r = await fetch(entry.url, { cache: 'no-store' });
  if (!r.ok) throw new Error('blob read ' + r.status);
  return r.json();
}

function valid(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.rev !== 'string' || data.rev.length > 40) return false;
  const e = data.edits;
  if (!e || typeof e !== 'object' || typeof e.t !== 'object' || e.t === null) return false;
  if (e.skip != null && !Array.isArray(e.skip)) return false;
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const all = await versions();
      if (!all.length) return res.status(404).json({ error: 'empty' });
      return res.status(200).json({ version: all[0].v, data: await read(all[0]) });
    }
    if (req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body || '{}');
      const base = body && body.base;
      const data = body && body.data;
      if (!valid(data) || typeof base !== 'string') return res.status(400).json({ error: 'invalid' });
      const json = JSON.stringify(data);
      if (Buffer.byteLength(json) > MAX_BYTES) return res.status(413).json({ error: 'too large' });

      const all = await versions();
      const current = all.length ? all[0].v : 'none';
      if (base !== 'force' && base !== current) {
        return res.status(409).json({ version: current, data: all.length ? await read(all[0]) : null });
      }
      const v = String(Math.max(Date.now(), current === 'none' ? 0 : Number(current) + 1));
      await put(PREFIX + v + '.json', json, {
        access: 'public', contentType: 'application/json', addRandomSuffix: false,
      });
      const old = all.slice(KEEP - 1).map((b) => b.url);
      if (old.length) await del(old).catch(() => {});
      return res.status(200).json({ version: v });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server' });
  }
}
