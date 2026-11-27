/**
 * Server-side allowlist for Home Assistant write services.
 * Locks, alarms, and other high-risk domains are refused here —
 * prompt text alone is not enough.
 */

const ALLOWED_DOMAINS = new Set([
  "light",
  "switch",
  "scene",
  "script",
  "input_boolean",
  "input_number",
  "input_select",
  "input_button",
  "fan",
  "cover",
  "climate",
  "media_player",
  "button",
  "automation",
  "humidifier",
  "vacuum",
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
]);

const BLOCKED_DOMAINS = new Set([
  "lock",
  "alarm_control_panel",
  "homeassistant",
  "person",
  "zone",
]);

export function assertHaServiceAllowed(
  domain: string,
  service: string,
): { ok: true } | { ok: false; error: string } {
  const d = domain.trim().toLowerCase();
  const s = service.trim().toLowerCase();
  if (!d || !s) return { ok: false, error: "domain and service required" };
  if (BLOCKED_DOMAINS.has(d)) {
    return {
      ok: false,
      error: `domain_not_allowed:${d}`,
    };
  }
  if (!ALLOWED_DOMAINS.has(d)) {
    return {
      ok: false,
      error: `domain_not_allowed:${d}`,
    };
  }
  if (BLOCKED_SERVICES.has(s) || s.includes("unlock") || s.includes("disarm")) {
    return {
      ok: false,
      error: `service_not_allowed:${d}.${s}`,
    };
  }
  return { ok: true };
}
