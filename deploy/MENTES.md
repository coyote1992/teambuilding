# How saving and deployment work (Fonte Viva workshop deck)

Live: https://fonte-viva-workshop.vercel.app · source: `deploy/` (served as the project root). The deck is built from `src/deck.tpl.html` with `python3 src/build.py`, which embeds the Outfit font, logo and flowchart and writes `deploy/index.html` and `Fonte_Viva_kockazati_workshop.html`.

## 1. Architecture

A single self-contained HTML deck (`index.html`) plus one Vercel serverless function, `api/deck.js`. The function keeps the deck's edits as one JSON document in Vercel Blob. Every save writes a new file `fonte-viva-workshop/deck-<timestamp>.json`; the newest file is the current state, and only the 10 newest are kept. The browser auto-saves about one second after an edit, uses the timestamp as a version for optimistic concurrency, and polls every 15 seconds (and on tab focus) for other people's changes. There is no login: anyone with the link can read and write.

Only the edits are stored, not the deck: text and style changes per editable element, hidden slides, durations and the sound setting. Timer state is never shared.

## 2. Vercel setup

- Project `fonte-viva-workshop` (`prj_XyG9rKrofh6QTzmNLVLQtyIngTsY`), team `team_rkleFyVmaMkYVAGTOhJMezdX`, framework "Other", root directory `deploy`.
- Blob store `fonte-viva-workshop-data` (`store_yk6PE1bszEDRrqTX`), public, region `fra1`, linked to the project, which created `BLOB_READ_WRITE_TOKEN` for production, preview and development. The token is read implicitly by `@vercel/blob`; it is never in the code.
- `deploy/package.json`: `"type": "module"`, dependency `@vercel/blob ^1.0.0`.

## 3. API: `/api/deck` (always `Cache-Control: no-store`)

- `GET` → `404 {"error":"empty"}` when nothing is saved, otherwise `200 {"version":"<ts>","data":{"rev":"v5","edits":{...}}}`.
- `PUT` with `{"base":"<version>|none|force","data":{"rev":"...","edits":{"t":{},"skip":[],"dur":{},"sound":true}}}`:
  validates the shape (400) and size ≤ 500 000 bytes (413); unless `base` is `force` it must equal the current version, else `409 {"version":current,"data":current}`; writes `deck-<max(now, current+1)>.json`; deletes all but the 10 newest; returns `200 {"version":"<v>"}`.
- Other methods `405`, exceptions `500 {"error":"server"}`.

## 4. Client logic (in the deck's script, section "shared store")

- Active only over http(s). Opened as a local file, the deck saves only to `localStorage`, as before.
- `persist()` (called on every edit) writes the local copy and schedules `save()` 900 ms later.
- `save(force)`: skips while another save runs, during an unresolved conflict, or when nothing changed since the last confirmed save. `409` with data of the same `rev` opens the conflict dialog ("Az övék betöltése" / "Az enyém maradjon" = `force`). `409` from an older layout (different `rev`) is overwritten. Network or 5xx errors retry every 8 s.
- Boot: local copy first, then `GET`; the shared version wins. If the shared copy belongs to an older layout (`rev` differs), it is ignored and the next save replaces it.
- `poll()` loads a newer version only when this tab has no unsaved edits and nobody is typing; otherwise the next save produces the conflict dialog.
- The control bar shows the status: Mentve, Mentésre vár, Mentés…, Offline, Ütközés. On page close, unsaved edits are sent with a `keepalive` request.

Edits are keyed by element order (`data-eid`) and tied to `data-rev`. When slides are added, removed or reordered, bump `data-rev` so old edits are not applied to the wrong elements.

## 5. Testing by hand

```
U=https://fonte-viva-workshop.vercel.app/api/deck
curl -s $U
curl -s -X PUT -H "Content-Type: application/json" --data '{"base":"<current version>","data":{...}}' $U
```

Read first and keep a copy before any manual write; use `"base":"force"` only on purpose.

## 6. Deployment

Through the Vercel MCP connector: `create_deployment` with `project` set to the id above, `target: "production"`, and `gitSource` `{type:"github", org:"coyote1992", repo:"teambuilding", ref:<branch>, sha:<commit>}`. The production alias moves automatically. CLI alternative from `deploy/`: `npx vercel link`, then `npx vercel --prod`.

## 7. Limits

- No authentication; options are a shared password checked in `api/deck.js` or Vercel Deployment Protection.
- Conflicts are whole-document (load theirs or keep mine).
- Only 10 versions are kept and there is no UI to browse them.
