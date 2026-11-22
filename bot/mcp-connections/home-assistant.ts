import { defineConnection } from "@grok/agent-sdk/connections";

/**
 * Remote Home Assistant / Nabu Casa MCP stub.
 *
 * Agent SDK expands `${NAME}` only in headers/env — not in `url`.
 * For local `dev`/`serve`, export NABU_CASA_URL or HA_URL before start so
 * this module can build the URL at import time. On Cursor hosting, either:
 *   1) set the URL in the environment at process start, or
 *   2) replace the fallback once Steve's remote base URL is known, or
 *   3) rely on the REST tools (ha_get_state / ha_call_service), which read
 *      secrets per-call and work with hosted secret binding today.
 *
 * Token uses ${HA_TOKEN} so it resolves per-turn on hosting.
 * Connection is optional so missing MCP does not block the agent.
 */
const base = (
  process.env.NABU_CASA_URL ||
  process.env.HA_URL ||
  ""
).replace(/\/$/, "");

/** Prefer HA MCP SSE path when base is set; otherwise a non-routable stub. */
const url = base
  ? `${base}/api/mcp`
  : "https://example.invalid/mcp";

export default defineConnection({
  url,
  headers: {
    Authorization: "Bearer ${HA_TOKEN}",
  },
  optional: true,
  advertiseTools: true,
});
