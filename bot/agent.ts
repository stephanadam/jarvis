import { defineAgent } from "@grok/agent-sdk";

/**
 * Hosted turns use a Cursor model (Agent SDK has no Gemini model id).
 * Steve's Google AI Studio key drives Gemini via the `gemini_generate`
 * tool / documented API path — see README.
 */
export default defineAgent({
  name: "Jarvis",
  description:
    "Home assistant brain: Home Assistant via Nabu Casa, capability plugins, Gemini API when bound.",
  model: {
    id: "grok-4.7",
    params: [
      { id: "reasoning_effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  hosting: {
    // Add Steve's Nabu Casa hostname (e.g. xxxxx.ui.nabu.casa) once known.
    egressDomains: ["generativelanguage.googleapis.com"],
    secretNames: [
      "GEMINI_API_KEY",
      "GOOGLE_API_KEY",
      "NABU_CASA_URL",
      "HA_URL",
      "HA_TOKEN",
    ],
  },
});
