import { extractClientApiKey, requireJarvisApiKey } from "@/lib/auth";
import { listCapabilities } from "@/lib/capabilities";
import { resolveGeminiKey } from "@/lib/gemini";
import { resolveHaConfig } from "@/lib/ha";

export const runtime = "nodejs";

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/** Public liveness — no secret or home details without a valid API key. */
export async function GET(request: Request) {
  try {
    if (!extractClientApiKey(request)) {
      return Response.json(
        { ok: true, service: "jarvis" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const unauthorized = requireJarvisApiKey(request);
    if (unauthorized) return unauthorized;

    const gemini = resolveGeminiKey();
    const ha = resolveHaConfig();

    return Response.json(
      {
        ok: true,
        service: "jarvis",
        time: new Date().toISOString(),
        secrets: {
          GEMINI_API_KEY: present(process.env.GEMINI_API_KEY),
          GOOGLE_API_KEY: present(process.env.GOOGLE_API_KEY),
          NABU_CASA_URL: present(process.env.NABU_CASA_URL),
          HA_URL: present(process.env.HA_URL),
          HA_TOKEN: present(process.env.HA_TOKEN),
          JARVIS_API_KEY: present(process.env.JARVIS_API_KEY),
        },
        geminiReady: gemini.ok,
        haReady: ha.ok,
        capabilities: listCapabilities().map((c) => ({
          id: c.id,
          status: c.status,
          version: c.version,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "internal_error",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
