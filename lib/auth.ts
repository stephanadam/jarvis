import { timingSafeEqual } from "node:crypto";

/**
 * Device/client API key gate for Jarvis HTTP routes.
 * Bind JARVIS_API_KEY as an app secret; clients send it as
 * Authorization: Bearer … or x-api-key / x-jarvis-api-key.
 */

export function resolveJarvisApiKey(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; key: string } | { ok: false; missing: string[] } {
  const key = (env.JARVIS_API_KEY || "").trim();
  if (!key) return { ok: false, missing: ["JARVIS_API_KEY"] };
  return { ok: true, key };
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function extractClientApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (match?.[1]) return match[1].trim();
  }
  const xApi =
    request.headers.get("x-api-key") ||
    request.headers.get("x-jarvis-api-key");
  if (xApi?.trim()) return xApi.trim();
  return null;
}

/**
 * Require a valid JARVIS_API_KEY on the request.
 * Returns null when authorized, or a Response to return as-is.
 */
export function requireJarvisApiKey(request: Request): Response | null {
  const configured = resolveJarvisApiKey();
  if (!configured.ok) {
    return Response.json(
      {
        ok: false,
        error: "server_misconfigured",
        missingSecrets: configured.missing,
        hint: "Bind JARVIS_API_KEY as an app secret, then send it from the client.",
      },
      { status: 503 },
    );
  }

  const provided = extractClientApiKey(request);
  if (!provided || !safeEqual(provided, configured.key)) {
    return Response.json(
      {
        ok: false,
        error: "unauthorized",
        hint: "Send Authorization: Bearer <JARVIS_API_KEY> (or x-api-key).",
      },
      { status: 401 },
    );
  }

  return null;
}
