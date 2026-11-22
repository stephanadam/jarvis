import { defineTool } from "@grok/agent-sdk/tools";
import { haFetch, resolveHaConfig } from "../lib/ha.js";
import * as z from "zod/v4";

export default defineTool({
  description:
    "Read a Home Assistant entity state via Nabu Casa (or HA_URL) REST API.",
  effect: "read",
  inputSchema: z.object({
    entity_id: z
      .string()
      .describe("Entity id, e.g. light.living_room or switch.porch"),
  }),
  async execute({ entity_id }) {
    const cfg = resolveHaConfig();
    if (!cfg.ok) {
      return {
        ok: false,
        error: "missing_secrets",
        missing: cfg.missing,
        hint: "Bind NABU_CASA_URL (or HA_URL) and HA_TOKEN as deployment secrets.",
      };
    }
    const { status, body } = await haFetch(
      `/api/states/${encodeURIComponent(entity_id)}`,
      {
        method: "GET",
        baseUrl: cfg.baseUrl,
        token: cfg.token,
      },
    );
    return { ok: status >= 200 && status < 300, status, entity_id, body };
  },
});
