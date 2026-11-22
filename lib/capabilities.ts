/**
 * Capability / plugin registry stub.
 *
 * Core Jarvis only knows capabilities: id, description, schemas, invoke.
 * New features (face recognition, video, etc.) register here — they are not
 * hardcoded in the brain loop. Values of secrets are never stored; only names.
 */

export type CapabilityId =
  | "home_assistant.state"
  | "home_assistant.call_service"
  | "vision.face_recognize";

export type Capability = {
  id: CapabilityId;
  version: string;
  description: string;
  /** Secret names the capability expects (values bound at runtime). */
  requiredSecrets: string[];
  /** Phase where this becomes real. */
  status: "live" | "stub";
};

const CAPABILITIES: Capability[] = [
  {
    id: "home_assistant.state",
    version: "0.1.0",
    description: "Read a Home Assistant entity state via Nabu Casa REST.",
    requiredSecrets: ["NABU_CASA_URL|HA_URL", "HA_TOKEN"],
    status: "live",
  },
  {
    id: "home_assistant.call_service",
    version: "0.1.0",
    description: "Call a Home Assistant service (turn on/off, scenes, etc.).",
    requiredSecrets: ["NABU_CASA_URL|HA_URL", "HA_TOKEN"],
    status: "live",
  },
  {
    id: "vision.face_recognize",
    version: "0.0.0",
    description:
      "Phase 4 stub: face recognition over camera feeds. Not implemented.",
    requiredSecrets: [],
    status: "stub",
  },
];

export function listCapabilities(): Capability[] {
  return CAPABILITIES.map((c) => ({ ...c }));
}

export function getCapability(id: CapabilityId): Capability | undefined {
  return CAPABILITIES.find((c) => c.id === id);
}
