# Jarvis

Steve's home-assistant **HTTP cloud brain**: Gemini + Home Assistant (Nabu Casa),
deployable with Cursor **publish-app**, plus a custom **iOS voice client** under
`ios/Jarvis/` (not the Grok iPhone app).

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
| `GET` | `/api/health` | — | `{ ok, secrets:{name:boolean}, geminiReady, haReady, apiKeyRequired, capabilities }` |
| `POST` | `/api/chat` | `{ "message": "…" }` or `{ "text": "…" }` | `{ ok, reply, text, model, toolsUsed?, error? }` |

When `JARVIS_API_KEY` is set, `/api/*` requires header `X-Jarvis-Key` (or
`Authorization: Bearer`).

## Secrets (names only — never paste values in chat)

| Name | Purpose |
| --- | --- |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Google AI Studio key for the brain |
| `NABU_CASA_URL` or `HA_URL` | Remote HA base URL (no trailing slash) |
| `HA_TOKEN` | Home Assistant long-lived access token |
| `JARVIS_API_KEY` | Optional device key for iPhone / non-browser clients |

Bind via Cursor app secrets when publishing (Dashboard / publish dialog). Agents
never need the raw values in conversation.

## Safari / mobile voice (no Mac / TestFlight)

Open `/` or `/voice` in **Safari** on iPhone:

- Hold the orb → Web Speech API STT → `POST /api/chat` → `speechSynthesis` TTS
- Text chat always available as fallback
- **Settings** (localStorage): API base URL + `JARVIS_API_KEY` (sent as `X-Jarvis-Key`)
- **Home Screen** tip sheet: Safari Share → Add to Home Screen

**Auth note:** a **private** Cursor publish-app returns `sign_in_required` before
Next.js. For the phone: publish **public** + bind `JARVIS_API_KEY`, then enter the
same key in the page Settings.

## iOS native app (optional later)

```bash
open ios/Jarvis/Jarvis.xcodeproj   # Mac + Xcode 15+ + Apple Developer
```

Hold-to-talk → Apple Speech → `POST /api/chat` → AVSpeech TTS. Details and
**TestFlight checklist**: [`ios/Jarvis/README.md`](ios/Jarvis/README.md),
[`ios/Jarvis/TESTFLIGHT.md`](ios/Jarvis/TESTFLIGHT.md).

## Layout

| Path | Role |
| --- | --- |
| `app/` | Next.js UI (Safari hold-to-talk + text) + `api/health` + `api/chat` |
| `lib/` | Gemini client, HA REST, capability registry, chat tool loop, API key helper |
| `middleware.ts` | Optional `JARVIS_API_KEY` gate for `/api/*` |
| `ios/Jarvis/` | SwiftUI voice MVP (TestFlight via Steve’s Apple account) |
| `bot/` | Legacy Agent SDK scaffold (not used for deploy) |
| `evals/` | Legacy Agent SDK evals |

## Publish (Steve)

1. Merge/push this HTTP app (+ voice UI + optional iOS folder).
2. In the Cloud Agent chat, confirm **Publish** when proposed (or ask the agent to `publish-app`).
3. For phone access: visibility **public** + bind `JARVIS_API_KEY` (and `GEMINI_API_KEY`; HA later).
4. Smoke `GET /api/health` then `POST /api/chat` (with `X-Jarvis-Key` if set).
5. On iPhone Safari: open the public URL → Settings → paste API key → Add to Home Screen.
6. Optional later: Mac + Apple Developer → `ios/Jarvis` → TestFlight.

No Cursor Team / `agent-sdk deploy --team` required.

## Models

| Path | What runs |
| --- | --- |
| **HTTP brain (this app)** | Gemini (default `gemini-2.5-flash`) via Google AI Studio |
| **Legacy Agent SDK** | Would use Cursor model `grok-4.7` — not the deploy path |

## Notes

- Capability registry includes live `home_assistant.*` and stub `vision.face_recognize`.
- Health reports whether each secret **name** is present (boolean), never values.
- Architecture: Project doc `docs/jarvis-architecture.md`.
