/**
 * Home Assistant REST helpers (Nabu Casa remote URL + long-lived token).
 * Read secrets inside handlers — published secrets are not available at import.
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

/** JSON-shaped HA response body. */
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

export async function haGetState(entityId: string): Promise<{
  ok: boolean;
  status?: number;
  entity_id: string;
  body?: HaJson;
  error?: string;
  missing?: string[];
}> {
  const cfg = resolveHaConfig();
  if (!cfg.ok) {
    return {
      ok: false,
      entity_id: entityId,
      error: "missing_secrets",
      missing: cfg.missing,
    };
  }
  const { status, body } = await haFetch(
    `/api/states/${encodeURIComponent(entityId)}`,
    { method: "GET", baseUrl: cfg.baseUrl, token: cfg.token },
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    entity_id: entityId,
    body,
  };
}

export async function haCallService(args: {
  domain: string;
  service: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}): Promise<{
  ok: boolean;
  status?: number;
  domain: string;
  service: string;
  entity_id: string | null;
  body?: HaJson;
  error?: string;
  missing?: string[];
}> {
  const cfg = resolveHaConfig();
  if (!cfg.ok) {
    return {
      ok: false,
      domain: args.domain,
      service: args.service,
      entity_id: args.entity_id ?? null,
      error: "missing_secrets",
      missing: cfg.missing,
    };
  }
  const payload: Record<string, unknown> = { ...(args.data ?? {}) };
  if (args.entity_id) payload.entity_id = args.entity_id;

  const { status, body } = await haFetch(
    `/api/services/${encodeURIComponent(args.domain)}/${encodeURIComponent(args.service)}`,
    {
      method: "POST",
      baseUrl: cfg.baseUrl,
      token: cfg.token,
      body: JSON.stringify(payload),
    },
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    domain: args.domain,
    service: args.service,
    entity_id: args.entity_id ?? null,
    body,
  };
}
