# Jarvis

Steve's home-assistant **HTTP cloud brain**: Gemini + Home Assistant (Nabu Casa),
deployable with Cursor **publish-app**. Designed for a future iPhone voice client
(`POST /api/chat` text in/out).

Agent SDK files under `bot/` remain in-repo as an unused scaffold. Deploy does
**not** use `agent-sdk deploy` or `CURSOR_API_KEY`.

## Run locally

```bash
cd jarvis
cp .env.example .env.local   # fill secret names if you have values locally
npm install
npm run dev
# http://127.0.0.1:3000
```

Smoke:

```bash
curl -s http://127.0.0.1:3000/api/health | jq .
curl -s -X POST http://127.0.0.1:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"message":"List your capabilities."}' | jq .
```

Without Gemini keys, `/api/chat` returns a **sample-mode** reply that names the
secrets to bind. With keys + HA secrets bound, Gemini can call HA tools.

```bash
npm run check
npm run build
```

## API

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `{ ok, secrets:{name:boolean}, geminiReady, haReady, capabilities }` |
| `POST` | `/api/chat` | `{ "message": "…" }` or `{ "text": "…" }` | `{ ok, reply, text, model, toolsUsed?, error? }` |

## Secrets (names only — never paste values in chat)

| Name | Purpose |
| --- | --- |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Google AI Studio key for the brain |
| `NABU_CASA_URL` or `HA_URL` | Remote HA base URL (no trailing slash) |
| `HA_TOKEN` | Home Assistant long-lived access token |

Bind via Cursor app secrets when publishing (Dashboard / publish dialog). Agents
never need the raw values in conversation.

## Layout

| Path | Role |
| --- | --- |
| `app/` | Next.js UI + `api/health` + `api/chat` |
| `lib/` | Gemini client, HA REST, capability registry, chat tool loop |
| `bot/` | Legacy Agent SDK scaffold (not used for deploy) |
| `evals/` | Legacy Agent SDK evals |

## Publish (Steve)

1. Merge/push this HTTP app.
2. In the Cloud Agent chat, confirm **Publish** when proposed (or ask the agent to `publish-app`).
3. Bind secrets by name in Cursor (Secrets / publish UI): `GEMINI_API_KEY`, `NABU_CASA_URL`, `HA_TOKEN` (and optional aliases).
4. Smoke `GET /api/health` then `POST /api/chat` on the published URL.
5. Defer iOS until Phase 1 text path is green.

No Cursor Team / `agent-sdk deploy --team` required.

## Models

| Path | What runs |
| --- | --- |
| **HTTP brain (this app)** | Gemini (default `gemini-3.8-flash`) via Google AI Studio |
| **Legacy Agent SDK** | Would use Cursor model `grok-4.7` — not the deploy path |

## Notes

- Capability registry includes live `home_assistant.*` and stub `vision.face_recognize`.
- Health reports whether each secret **name** is present (boolean), never values.
- Architecture: Project doc `docs/jarvis-architecture.md`.
