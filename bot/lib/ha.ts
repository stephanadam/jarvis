/**
 * Home Assistant REST helpers (Nabu Casa remote URL + long-lived token).
 * Read secrets inside handlers — hosted secrets are not available at import.
 */

export type HaConfig =
  | { ok: true; baseUrl: string; token: string }
  | { ok: false; missing: string[] };

export function resolveHaConfig(
  env: NodeJS.ProcessEnv = process.env,
): HaConfig {
  const baseRaw = (env.NABU_CASA_URL || env.HA_URL || "").trim();
  const token = (env.HA_TOKEN || "").trim();
  const missing: string[] = [];
  if (!baseRaw) missing.push("NABU_CASA_URL (or HA_URL)");
  if (!token) missing.push("HA_TOKEN");
  if (missing.length > 0) return { ok: false, missing };

  const baseUrl = baseRaw.replace(/\/$/, "");
  return { ok: true, baseUrl, token };
}

/** JSON-shaped HA response body (tool results cannot use `unknown`). */
export type HaJson =
  | string
  | number
  | boolean
  | null
  | HaJson[]
  | { [key: string]: HaJson };

export async function haFetch(
  path: string,
  init: RequestInit & { token: string; baseUrl: string },
): Promise<{ status: number; body: HaJson }> {
  const url = `${init.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const { token, baseUrl: _base, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!text) return { status: res.status, body: null };
  try {
    return { status: res.status, body: JSON.parse(text) as HaJson };
  } catch {
    return { status: res.status, body: text };
  }
}
