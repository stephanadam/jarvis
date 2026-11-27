"use client";

import { FormEvent, useEffect, useState } from "react";

const API_KEY_STORAGE = "jarvis_api_key";

type Health = {
  ok: boolean;
  geminiReady?: boolean;
  haReady?: boolean;
  secrets?: Record<string, boolean>;
  capabilities?: Array<{ id: string; status: string }>;
};

type ChatResponse = {
  ok: boolean;
  reply?: string;
  text?: string;
  model?: string;
  error?: string;
  missingSecrets?: string[];
  toolsUsed?: Array<{ name: string }>;
};

export default function HomePage() {
  const [apiKey, setApiKey] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [message, setMessage] = useState("List your capabilities.");
  const [reply, setReply] = useState<string>("");
  const [meta, setMeta] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const saved = window.localStorage.getItem(API_KEY_STORAGE) || "";
    setApiKey(saved);
  }, []);

  useEffect(() => {
    if (!apiKey.trim()) {
      setHealth({ ok: true });
      return;
    }
    fetch("/api/health", {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    })
      .then((r) => r.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setHealth({ ok: false }));
  }, [apiKey]);

  function saveApiKey(value: string) {
    setApiKey(value);
    window.localStorage.setItem(API_KEY_STORAGE, value);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("Paste JARVIS_API_KEY in Settings below (same value you bind in Cursor).");
      return;
    }
    setBusy(true);
    setError("");
    setReply("");
    setMeta("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as ChatResponse;
      if (!data.ok) {
        setError(data.error || `HTTP ${res.status}`);
      }
      setReply(data.reply || data.text || "");
      const bits: string[] = [];
      if (data.model) bits.push(`model: ${data.model}`);
      if (data.toolsUsed?.length) {
        bits.push(`tools: ${data.toolsUsed.map((t) => t.name).join(", ")}`);
      }
      if (data.missingSecrets?.length) {
        bits.push(`missing: ${data.missingSecrets.join(", ")}`);
      }
      setMeta(bits.join(" · "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "3.5rem 1.25rem 4rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.75rem, 8vw, 4.25rem)",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        Jarvis
      </p>
      <p
        style={{
          margin: "0.85rem 0 0",
          color: "var(--muted)",
          maxWidth: "36ch",
          lineHeight: 1.45,
        }}
      >
        Cloud brain for a future iPhone voice client. Text in, Gemini + Home
        Assistant tools out.
      </p>

      <section
        style={{
          marginTop: "2.25rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--line)",
        }}
      >
        <label
          htmlFor="apiKey"
          style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)" }}
        >
          Settings · JARVIS_API_KEY (stored only in this browser)
        </label>
        <input
          id="apiKey"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => saveApiKey(e.target.value)}
          placeholder="Bind in Cursor secrets, paste here / Safari Settings later"
          style={{
            width: "100%",
            marginTop: "0.4rem",
            padding: "0.7rem 1rem",
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "rgba(8, 14, 12, 0.65)",
            color: "var(--ink)",
          }}
        />
        <p style={{ margin: "0.55rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
          Health:{" "}
          {health == null
            ? "checking…"
            : !apiKey.trim()
              ? "ok · enter API key for details"
              : health.ok
                ? `ok · gemini ${health.geminiReady ? "ready" : "sample"} · HA ${health.haReady ? "ready" : "unbound"}`
                : "unreachable"}
        </p>
        {health?.capabilities && (
          <p style={{ margin: "0.4rem 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
            Caps:{" "}
            {health.capabilities
              .map((c) => `${c.id} (${c.status})`)
              .join(" · ")}
          </p>
        )}
      </section>

      <form onSubmit={onSubmit} style={{ marginTop: "1.75rem" }}>
        <label
          htmlFor="message"
          style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)" }}
        >
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            marginTop: "0.4rem",
            padding: "0.85rem 1rem",
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "rgba(8, 14, 12, 0.65)",
            color: "var(--ink)",
            resize: "vertical",
          }}
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          style={{
            marginTop: "0.85rem",
            padding: "0.7rem 1.15rem",
            borderRadius: 999,
            border: "none",
            background: busy ? "var(--accent-dim)" : "var(--accent)",
            color: "#04120c",
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Thinking…" : "Send"}
        </button>
      </form>

      {(reply || error) && (
        <section style={{ marginTop: "1.75rem" }}>
          {error && (
            <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{error}</p>
          )}
          {reply && (
            <p
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                padding: "1rem 1.1rem",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "rgba(8, 14, 12, 0.45)",
              }}
            >
              {reply}
            </p>
          )}
          {meta && (
            <p style={{ margin: "0.55rem 0 0", color: "var(--muted)", fontSize: "0.8rem" }}>
              {meta}
            </p>
          )}
        </section>
      )}

      <section
        style={{
          marginTop: "2.5rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--line)",
          color: "var(--muted)",
          fontSize: "0.85rem",
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: 0 }}>
          API: <code>POST /api/chat</code> needs{" "}
          <code>Authorization: Bearer &lt;JARVIS_API_KEY&gt;</code>
        </p>
        <p style={{ margin: "0.45rem 0 0" }}>
          Bind <code>JARVIS_API_KEY</code> in Cursor secrets (secure form). Use
          the same value here and later in Safari Settings for the iPhone app.
        </p>
        <p style={{ margin: "0.45rem 0 0" }}>
          Also: <code>GEMINI_API_KEY</code> / <code>GOOGLE_API_KEY</code>,{" "}
          <code>NABU_CASA_URL</code> / <code>HA_URL</code>, <code>HA_TOKEN</code>
        </p>
      </section>
    </main>
  );
}
