import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";

export function middleware(request: NextRequest) {
  const auth = authorizeApiRequest(request);
  if (auth.ok) return NextResponse.next();

  const status = auth.reason === "missing_key" ? 401 : 403;
  return NextResponse.json(
    {
      ok: false,
      error: auth.reason === "missing_key" ? "api_key_required" : "api_key_invalid",
      hint:
        "Set header X-Jarvis-Key (or Authorization: Bearer) to match JARVIS_API_KEY.",
    },
    { status },
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
