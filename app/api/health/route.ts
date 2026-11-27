import { resolveJarvisApiKey } from "@/lib/api-auth";
import { listCapabilities } from "@/lib/capabilities";
import { resolveGeminiKey } from "@/lib/gemini";
import { resolveHaConfig } from "@/lib/ha";

export const runtime = "nodejs";

function present(name: string, value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export async function GET() {
  const gemini = resolveGeminiKey();
  const ha = resolveHaConfig();
  const apiKeyConfigured = Boolean(resolveJarvisApiKey());

  return Response.json({
    ok: true,
    service: "jarvis",
    time: new Date().toISOString(),
    secrets: {
      GEMINI_API_KEY: present("GEMINI_API_KEY", process.env.GEMINI_API_KEY),
      GOOGLE_API_KEY: present("GOOGLE_API_KEY", process.env.GOOGLE_API_KEY),
      NABU_CASA_URL: present("NABU_CASA_URL", process.env.NABU_CASA_URL),
      HA_URL: present("HA_URL", process.env.HA_URL),
      HA_TOKEN: present("HA_TOKEN", process.env.HA_TOKEN),
      JARVIS_API_KEY: present("JARVIS_API_KEY", process.env.JARVIS_API_KEY),
    },
    geminiReady: gemini.ok,
    haReady: ha.ok,
    /** True when phone clients must send X-Jarvis-Key / Bearer. */
    apiKeyRequired: apiKeyConfigured,
    capabilities: listCapabilities().map((c) => ({
      id: c.id,
      status: c.status,
      version: c.version,
    })),
  });
}
