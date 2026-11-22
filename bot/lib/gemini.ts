/**
 * Google AI Studio (Gemini) HTTP helper.
 * Hosted Agent SDK turns use a Cursor model; this path is for explicit
 * Gemini API calls when GEMINI_API_KEY or GOOGLE_API_KEY is bound.
 */

export type GeminiKey =
  | { ok: true; apiKey: string; source: "GEMINI_API_KEY" | "GOOGLE_API_KEY" }
  | { ok: false; missing: string[] };

export function resolveGeminiKey(
  env: NodeJS.ProcessEnv = process.env,
): GeminiKey {
  const gemini = (env.GEMINI_API_KEY || "").trim();
  if (gemini) return { ok: true, apiKey: gemini, source: "GEMINI_API_KEY" };
  const google = (env.GOOGLE_API_KEY || "").trim();
  if (google) return { ok: true, apiKey: google, source: "GOOGLE_API_KEY" };
  return { ok: false, missing: ["GEMINI_API_KEY", "GOOGLE_API_KEY"] };
}

export type GeminiGenerateResult = {
  ok: boolean;
  model: string;
  text?: string;
  status?: number;
  error?: string;
};

/** Default Flash model for low-latency home-assistant style replies. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export async function generateContent(args: {
  apiKey: string;
  model?: string;
  prompt: string;
}): Promise<GeminiGenerateResult> {
  const model = args.model?.trim() || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: args.prompt }] }],
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  } | null;

  if (!res.ok) {
    return {
      ok: false,
      model,
      status: res.status,
      error: json?.error?.message || `Gemini HTTP ${res.status}`,
    };
  }

  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? "";

  return { ok: true, model, text, status: res.status };
}
