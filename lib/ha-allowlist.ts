/**
 * Home Assistant write policy.
 *
 * HA writes are disabled while Nabu/HA secrets are on hold and until a
 * strict entity allowlist exists. Scripts, automations, buttons, and covers
 * must never be a bypass for locks/alarms.
 *
 * Set HA_WRITES_ENABLED=true later only with a real domain+entity allowlist.
 */

export const HA_WRITES_ENABLED = false;

/** Domains that must never be writable via Jarvis (even when writes return). */
const BLOCKED_DOMAINS = new Set([
  "lock",
  "alarm_control_panel",
  "homeassistant",
  "person",
  "zone",
  "script",
  "automation",
  "button",
  "input_button",
  "cover",
]);

/**
 * When writes are re-enabled, only these domains may be called — and only
 * with entity_id (no area_id / device_id / label_id fan-out in `data`).
 */
const ALLOWED_DOMAINS_WHEN_ENABLED = new Set([
  "light",
  "switch",
  "scene",
  "fan",
  "climate",
  "media_player",
  "input_boolean",
  "input_number",
  "input_select",
]);

const BLOCKED_SERVICES = new Set([
  "unlock",
  "disarm",
  "alarm_disarm",
  "alarm_arm_home",
  "alarm_arm_away",
  "alarm_arm_night",
  "alarm_arm_vacation",
  "alarm_trigger",
  "open",
  "open_cover",
  "toggle",
  "set_cover_position",
  "set_cover_tilt_position",
]);

export type HaServiceCheck =
  | { ok: true; entity_id: string; data?: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Refuse unsafe or disabled Home Assistant writes.
 * Always requires entity_id matching the domain; strips fan-out target fields.
 */
export function assertHaServiceAllowed(
  domain: string,
  service: string,
  entityId?: string,
  data?: Record<string, unknown>,
): HaServiceCheck {
  if (!HA_WRITES_ENABLED) {
    return {
      ok: false,
      error: "ha_writes_disabled",
    };
  }

  const d = domain.trim().toLowerCase();
  const s = service.trim().toLowerCase();
  if (!d || !s) return { ok: false, error: "domain and service required" };
  if (BLOCKED_DOMAINS.has(d)) {
    return { ok: false, error: `domain_not_allowed:${d}` };
  }
  if (!ALLOWED_DOMAINS_WHEN_ENABLED.has(d)) {
    return { ok: false, error: `domain_not_allowed:${d}` };
  }
  if (
    BLOCKED_SERVICES.has(s) ||
    s.includes("unlock") ||
    s.includes("disarm") ||
    s.includes("open")
  ) {
    return { ok: false, error: `service_not_allowed:${d}.${s}` };
  }

  const entity = (entityId || "").trim();
  if (!entity) {
    return { ok: false, error: "entity_id_required" };
  }
  const prefix = `${d}.`;
  if (!entity.toLowerCase().startsWith(prefix)) {
    return { ok: false, error: "entity_id_domain_mismatch" };
  }

  // Drop targeting fan-out keys; only allow benign scalar extras later if needed.
  const safeData: Record<string, unknown> = {};
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      if (
        k === "area_id" ||
        k === "device_id" ||
        k === "label_id" ||
        k === "entity_id"
      ) {
        continue;
      }
      if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
      ) {
        safeData[k] = v;
      }
    }
  }

  return {
    ok: true,
    entity_id: entity,
    data: Object.keys(safeData).length > 0 ? safeData : undefined,
  };
}
