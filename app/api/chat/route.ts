import { createHash } from "node:crypto";
import { extractClientApiKey, requireJarvisApiKey } from "@/lib/auth";
import { runChat } from "@/lib/chat";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_MESSAGE_CHARS = 4000;

type ChatBody = {
  message?: unknown;
  text?: unknown;
};

/** Rate-limit by authenticated API key only — never trust X-Forwarded-For. */
function rateLimitKey(request: Request): string {
  const apiKey = extractClientApiKey(request) || "missing";
  const hash = createHash("sha256").update(apiKey).digest("hex").slice(0, 24);
  return `chat:key:${hash}`;
}

export async function POST(request: Request) {
  const unauthorized = requireJarvisApiKey(request);
  if (unauthorized) return unauthorized;

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return Response.json(
      { ok: false, error: "content_type_must_be_application_json" },
      { status: 415 },
    );
  }

  const limited = rateLimit({
    key: rateLimitKey(request),
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "rate_limited", retryAfterSec: limited.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return Response.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const message =
    typeof body.message === "string"
      ? body.message
      : typeof body.text === "string"
        ? body.text
        : "";

  if (!message.trim()) {
    return Response.json(
      { ok: false, error: "message is required (field: message or text)" },
      { status: 400 },
    );
  }

  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json(
      {
        ok: false,
        error: "message_too_long",
        maxChars: MAX_MESSAGE_CHARS,
      },
      { status: 413 },
    );
  }

  const result = await runChat(message);
  const status =
    result.ok ? 200 : result.error === "message is required" ? 400 : 502;

  return Response.json(
    {
      ok: result.ok,
      reply: result.reply,
      text: result.reply,
      model: result.model,
      toolsUsed: result.toolsUsed?.map((t) => ({ name: t.name })),
      error: result.error,
      missingSecrets: result.missingSecrets,
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
