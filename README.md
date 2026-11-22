# Jarvis

Steve's home-assistant brain: **Cursor Agent SDK** hosting, Home Assistant via
Nabu Casa, capability/plugin registry for future vision plugins.

## Models (honest split)

| Path | What runs | How |
| --- | --- | --- |
| **Hosted agent turns** | Cursor model `grok-4.7` (Agent SDK default; no Gemini model id in Agent SDK) | `bot/agent.ts` → Cursor-managed hosting |
| **Gemini API** | Google AI Studio models (default `gemini-2.5-flash`) | Server tool `gemini_generate` using `GEMINI_API_KEY` or `GOOGLE_API_KEY` |

Jarvis is **not** hosted as a Gemini model inside Agent SDK. Steve's Google AI
Studio key drives Gemini through the tool/API wrapper above.

## Channels

Playground + HTTP (always on with Agent SDK). No Slack/Teams yet.

## Secrets (names only — never paste values in chat)

Bind these in Cursor deployment secrets / local `.env` (see `.env.example`):

| Name | Purpose |
| --- | --- |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Google AI Studio key for `gemini_generate` |
| `NABU_CASA_URL` or `HA_URL` | Remote HA base URL (no trailing slash) |
| `HA_TOKEN` | Home Assistant long-lived access token |

After deploy:

```bash
npx --yes "@grok/agent-sdk@0.7.2" secret set jarvis GEMINI_API_KEY
npx --yes "@grok/agent-sdk@0.7.2" secret set jarvis NABU_CASA_URL
npx --yes "@grok/agent-sdk@0.7.2" secret set jarvis HA_TOKEN
npx --yes "@grok/agent-sdk@0.7.2" secret list jarvis
```

Also add Steve's Nabu Casa hostname to `hosting.egressDomains` in
`bot/agent.ts` (e.g. `xxxxx.ui.nabu.casa`) before relying on HA from hosting.

## Layout

- `bot/agent.ts` — model + hosting secrets/egress
- `bot/instructions.md` — Jarvis persona
- `bot/tools/` — `list_capabilities`, `ha_get_state`, `ha_call_service`, `gemini_generate`
- `bot/lib/` — capability registry, HA + Gemini helpers
- `bot/mcp-connections/home-assistant.ts` — optional remote MCP stub
- `bot/skills/home-control/` — HA procedure
- `evals/smoke.eval.ts` — capability registry smoke

## Test locally

```bash
cd jarvis
npx --yes "@grok/agent-sdk@0.7.2" validate --dir .
npx tsc --noEmit -p .
npx --yes "@grok/agent-sdk@0.7.2" tool call list_capabilities --dir . --input '{}'
npx --yes "@grok/agent-sdk@0.7.2" run --dir . --message "List your capabilities."
npx --yes "@grok/agent-sdk@0.7.2" dev
# http://127.0.0.1:3000/playground
npx --yes "@grok/agent-sdk@0.7.2" eval --dir . --tag smoke
```

Model turns need a Cursor credential (`CURSOR_API_KEY` or `agent-sdk login`).

## Deploy (do not run until Steve is ready)

Follow `~/.cursor/skills-cursor/agent-sdk-deploy/SKILL.md`:

1. Push this repo to GitHub.
2. `npx --yes "@grok/agent-sdk@0.7.2" validate --dir .`
3. `npx --yes "@grok/agent-sdk@0.7.2" deploy --dir . --dry-run`
4. Steve runs `npx --yes "@grok/agent-sdk@0.7.2" deploy --dir .` and saves the alias token.
5. Bind secrets (names above), then
   `npx --yes "@grok/agent-sdk@0.7.2" session create --slug jarvis --message "List capabilities" --wait`.

Manage at https://cursor.com/dashboard/deployed-agents.

## Notes / open items

- **MCP URL shape:** Agent SDK does not expand `${…}` in connection `url` (only
  headers/env). REST tools read secrets per-call and are the reliable HA path
  today. Confirm the real Nabu Casa / HA MCP path before relying on
  `bot/mcp-connections/home-assistant.ts` (stub uses `{base}/api/mcp`).
- **iOS voice app:** out of scope for this scaffold.
