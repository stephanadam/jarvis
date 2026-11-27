/**
 * Google AI Studio (Gemini) HTTP helper with optional function calling.
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

/** Default Flash model for low-latency home-assistant style replies. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export type GeminiPart =
  | { text: string }
  | {
      functionCall: {
        name: string;
        args?: Record<string, unknown>;
      };
    }
  | {
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    };

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type GeminiGenerateResult = {
  ok: boolean;
  model: string;
  text?: string;
  parts?: GeminiPart[];
  functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  status?: number;
  error?: string;
};

type GeminiApiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<Record<string, unknown>> };
  }>;
  error?: { message?: string };
};

function parseParts(raw: Array<Record<string, unknown>> | undefined): {
  text: string;
  parts: GeminiPart[];
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>;
} {
  const parts: GeminiPart[] = [];
  const functionCalls: Array<{ name: string; args: Record<string, unknown> }> =
    [];
  const textChunks: string[] = [];

  for (const p of raw ?? []) {
    if (typeof p.text === "string") {
      textChunks.push(p.text);
      parts.push({ text: p.text });
    }
    const fc = p.functionCall as
      | { name?: string; args?: Record<string, unknown> }
      | undefined;
    if (fc?.name) {
      const args = (fc.args ?? {}) as Record<string, unknown>;
      parts.push({ functionCall: { name: fc.name, args } });
      functionCalls.push({ name: fc.name, args });
    }
  }

  return {
    text: textChunks.join("").trim(),
    parts,
    functionCalls,
  };
}

export async function generateContent(args: {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  contents: GeminiContent[];
  tools?: GeminiFunctionDeclaration[];
}): Promise<GeminiGenerateResult> {
  const model = args.model?.trim() || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`;

  const body: Record<string, unknown> = {
    contents: args.contents,
  };
  if (args.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: args.systemInstruction }],
    };
  }
  if (args.tools && args.tools.length > 0) {
    body.tools = [{ functionDeclarations: args.tools }];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as GeminiApiResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      model,
      status: res.status,
      error: json?.error?.message || `Gemini HTTP ${res.status}`,
    };
  }

  const rawParts = json?.candidates?.[0]?.content?.parts;
  const parsed = parseParts(rawParts);

  return {
    ok: true,
    model,
    text: parsed.text || undefined,
    parts: parsed.parts,
    functionCalls: parsed.functionCalls,
    status: res.status,
  };
}
