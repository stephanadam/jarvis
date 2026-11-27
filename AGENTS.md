# jarvis

HTTP cloud brain for Steve's home assistant (Next.js + Gemini + Home Assistant).
Deploy with Cursor **publish-app**, not Agent SDK managed hosting.

Legacy Agent SDK scaffold lives under `bot/` (unused for deploy). Its prompt is
`bot/instructions.md` if you revive that path.

## Loop (HTTP app)

```bash
npm install
npm run check
npm run dev
# GET  /api/health
# POST /api/chat  {"message":"..."}
npm run build && npm start
```

Run under Node, never Bun.

## Layout

- `app/` — Next.js UI + API routes (`api/health`, `api/chat`)
- `lib/` — Gemini, HA REST, capability registry, chat tool loop
- `bot/` — unused Agent SDK scaffold (tools, instructions)
- `evals/` — legacy Agent SDK evals

## Do not

- Require `CURSOR_API_KEY` or `agent-sdk deploy` for the runnable product.
- Paste secret values into chat; document **names** only.
- Grow host TypeScript for reply composition beyond the thin chat/tool loop —
  persona stays in `lib/chat.ts` system prompt (and `bot/instructions.md` for SDK).
- Add npm deps casually; stick to Next + React unless needed.

## Secrets (names)

`GEMINI_API_KEY` / `GOOGLE_API_KEY`, `NABU_CASA_URL` / `HA_URL`, `HA_TOKEN`
