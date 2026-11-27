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

Smoke (requires `JARVIS_API_KEY` in `.env.local`):

```bash
curl -s http://127.0.0.1:3000/api/health | jq .
curl -s http://127.0.0.1:3000/api/health \
  -H "Authorization: Bearer $JARVIS_API_KEY" | jq .
curl -s -X POST http://127.0.0.1:3000/api/chat \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $JARVIS_API_KEY" \
  -d '{"message":"List your capabilities."}' | jq .
```

Without Gemini keys, authenticated `/api/chat` returns a **sample-mode** reply.
With Gemini + HA secrets bound, Gemini can call allowlisted HA tools.

```bash
npm run check
npm run build
```

## API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/health` | optional | Without key: `{ ok, service }` only. With key: readiness details. |
| `POST` | `/api/chat` | **required** | `Authorization: Bearer <JARVIS_API_KEY>` or `x-api-key` |

Body: `{ "message": "…" }` or `{ "text": "…" }` → `{ ok, reply, text, model, … }`.

## Secrets (names only — never paste values in chat)

| Name | Purpose |
| --- | --- |
| **`JARVIS_API_KEY`** | Client API key for chat (and detailed health). Bind in Cursor secure form; use the same value in the web UI Settings field and later in **Safari Settings** for the iPhone app. |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Google AI Studio key for the brain |
| `NABU_CASA_URL` or `HA_URL` | Remote HA base URL (no trailing slash) |
| `HA_TOKEN` | Home Assistant long-lived access token |

Bind via Cursor app secrets when publishing. Agents never need the raw values in conversation.

## Layout

| Path | Role |
| --- | --- |
| `app/` | Next.js UI + `api/health` + `api/chat` |
| `lib/` | Auth, Gemini, HA REST + allowlist, capability registry, chat loop |
| `bot/` | Legacy Agent SDK scaffold (not used for deploy) |
| `evals/` | Legacy Agent SDK evals |

## Publish (Steve)

1. Confirm **Publish** when the agent proposes an update.
2. Bind secrets in Cursor (secure form): **`JARVIS_API_KEY`**, `GEMINI_API_KEY`, and when ready `NABU_CASA_URL` / `HA_TOKEN`.
3. Open the private app, paste `JARVIS_API_KEY` into Settings, smoke chat.
4. iPhone: store the same `JARVIS_API_KEY` in Safari Settings when that app exists.

## Models

| Path | What runs |
| --- | --- |
| **HTTP brain (this app)** | Gemini (default `gemini-3.8-flash`) via Google AI Studio |
| **Legacy Agent SDK** | Would use Cursor model `grok-4.7` — not the deploy path |

## Notes

- Capability registry includes live `home_assistant.*` and stub `vision.face_recognize`.
- HA writes are allowlisted server-side (no locks/alarms/unlocks).
- Architecture: Project doc `docs/jarvis-architecture.md`.
