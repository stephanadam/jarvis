/**
 * Optional device API key for iPhone / non-browser clients.
 *
 * Cursor private publish-apps gate with Cursor sign-in before Next.js runs.
 * That blocks the iOS app. Practical path: publish the app as **public** and
 * set JARVIS_API_KEY so /api/* requires X-Jarvis-Key (or Bearer).
 */

export const JARVIS_API_KEY_HEADER = "x-jarvis-key";

export function resolveJarvisApiKey(): string | undefined {
  const value = process.env.JARVIS_API_KEY?.trim();
  return value || undefined;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/** Extract client key from X-Jarvis-Key or Authorization: Bearer. */
export function readClientApiKey(request: Request): string | undefined {
  const header = request.headers.get(JARVIS_API_KEY_HEADER)?.trim();
  if (header) return header;

  const auth = request.headers.get("authorization")?.trim();
  if (!auth) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() || undefined;
}

/**
 * When JARVIS_API_KEY is unset, auth is open (local/dev).
 * When set, client must present the matching key.
 */
export function authorizeApiRequest(request: Request): {
  ok: boolean;
  reason?: "missing_key" | "invalid_key";
} {
  const expected = resolveJarvisApiKey();
  if (!expected) return { ok: true };

  const provided = readClientApiKey(request);
  if (!provided) return { ok: false, reason: "missing_key" };
  if (!timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "invalid_key" };
  }
  return { ok: true };
}
