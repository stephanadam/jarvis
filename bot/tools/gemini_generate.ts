import { defineTool } from "@grok/agent-sdk/tools";
import {
  DEFAULT_GEMINI_MODEL,
  generateContent,
  resolveGeminiKey,
} from "../lib/gemini.js";
import * as z from "zod/v4";

export default defineTool({
  description:
    "Call Google AI Studio Gemini generateContent. Use when an explicit Gemini completion is needed; hosted turns still use the Cursor model in bot/agent.ts.",
  effect: "idempotent",
  inputSchema: z.object({
    prompt: z.string().describe("User prompt for Gemini"),
    model: z
      .string()
      .optional()
      .describe(`Gemini model id (default ${DEFAULT_GEMINI_MODEL})`),
  }),
  async execute({ prompt, model }) {
    const key = resolveGeminiKey();
    if (!key.ok) {
      return {
        ok: false,
        error: "missing_secrets",
        missing: key.missing,
        hint: "Bind GEMINI_API_KEY (preferred) or GOOGLE_API_KEY.",
      };
    }
    const result = await generateContent({
      apiKey: key.apiKey,
      model,
      prompt,
    });
    return { ...result, keySource: key.source };
  },
});
