import { defineTool } from "@grok/agent-sdk/tools";
import { haFetch, resolveHaConfig } from "../lib/ha.js";
import * as z from "zod/v4";

export default defineTool({
  description:
    "Call a Home Assistant service (e.g. light.turn_on) via Nabu Casa REST.",
  effect: "write",
  inputSchema: z.object({
    domain: z.string().describe("Service domain, e.g. light, switch, scene"),
    service: z.string().describe("Service name, e.g. turn_on, turn_off"),
    entity_id: z
      .string()
      .optional()
      .describe("Target entity_id when the service applies to one entity"),
    data: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Extra service data fields"),
  }),
  async execute({ domain, service, entity_id, data }) {
    const cfg = resolveHaConfig();
    if (!cfg.ok) {
      return {
        ok: false,
        error: "missing_secrets",
        missing: cfg.missing,
        hint: "Bind NABU_CASA_URL (or HA_URL) and HA_TOKEN as deployment secrets.",
      };
    }
    const payload: Record<string, unknown> = { ...(data ?? {}) };
    if (entity_id) payload.entity_id = entity_id;

    const { status, body } = await haFetch(
      `/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
      {
        method: "POST",
        baseUrl: cfg.baseUrl,
        token: cfg.token,
        body: JSON.stringify(payload),
      },
    );
    return {
      ok: status >= 200 && status < 300,
      status,
      domain,
      service,
      entity_id: entity_id ?? null,
      body,
    };
  },
});
