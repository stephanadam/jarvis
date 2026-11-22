import { runChat } from "@/lib/chat";

export const runtime = "nodejs";

type ChatBody = {
  message?: unknown;
  text?: unknown;
};

export async function POST(request: Request) {
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return Response.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const message =
    typeof body.message === "string"
      ? body.message
      : typeof body.text === "string"
        ? body.text
        : "";

  if (!message.trim()) {
    return Response.json(
      { ok: false, error: "message is required (field: message or text)" },
      { status: 400 },
    );
  }

  const result = await runChat(message);
  const status = result.ok ? 200 : result.error === "message is required" ? 400 : 502;

  return Response.json(
    {
      ok: result.ok,
      reply: result.reply,
      text: result.reply,
      model: result.model,
      toolsUsed: result.toolsUsed,
      error: result.error,
      missingSecrets: result.missingSecrets,
    },
    { status },
  );
}
