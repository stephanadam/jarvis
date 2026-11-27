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

function jsonError(
  status: number,
  error: string,
  extra: Record<string, unknown> = {},
) {
  return Response.json(
    { ok: false, error, ...extra },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireJarvisApiKey(request);
    if (unauthorized) return unauthorized;

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonError(415, "content_type_must_be_application_json");
    }

    const limited = rateLimit({
      key: rateLimitKey(request),
      limit: 20,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return Response.json(
        {
          ok: false,
          error: "rate_limited",
          retryAfterSec: limited.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limited.retryAfterSec),
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    let body: ChatBody;
    try {
      body = (await request.json()) as ChatBody;
    } catch {
      return jsonError(400, "invalid_json");
    }

    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.text === "string"
          ? body.text
          : "";

    if (!message.trim()) {
      return jsonError(
        400,
        "message is required (field: message or text)",
      );
    }

    if (message.length > MAX_MESSAGE_CHARS) {
      return jsonError(413, "message_too_long", {
        maxChars: MAX_MESSAGE_CHARS,
      });
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
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "internal_error",
    );
  }
}
