import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

/**
 * Legacy Agent SDK write tool — refuses all HA writes (same policy as HTTP brain).
 * Do not call Nabu Casa from this path until a strict allowlist is enabled.
 */
export default defineTool({
  description:
    "Call a Home Assistant service. Currently disabled (HA writes on hold).",
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
      .describe("Extra service data fields (ignored while writes are disabled)"),
  }),
  async execute({ domain, service, entity_id }) {
    return {
      ok: false,
      error: "ha_writes_disabled",
      domain,
      service,
      entity_id: entity_id ?? null,
      hint: "Home Assistant writes are disabled until a strict allowlist ships.",
    };
  },
});
