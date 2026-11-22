import { defineTool } from "@grok/agent-sdk/tools";
import { listCapabilities } from "../lib/capabilities.js";
import * as z from "zod/v4";

export default defineTool({
  description:
    "List Jarvis capability/plugin registry entries (live HA tools and future stubs).",
  effect: "read",
  inputSchema: z.object({}),
  async execute() {
    return { capabilities: listCapabilities() };
  },
});
