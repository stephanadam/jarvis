"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  createRecognizer,
  fetchHealth,
  loadSettings,
  postChat,
  saveSettings,
  speakText,
  speechRecognitionSupported,
  speechSynthesisSupported,
  stopSpeaking,
  type HealthPayload,
  type JarvisSettings,
} from "@/app/lib/jarvis-client";

type Phase = "idle" | "listening" | "thinking" | "speaking";

export default function VoiceConsole() {
  const [settings, setSettings] = useState<JarvisSettings>({
    apiBaseUrl: "",
    apiKey: "",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [draftBase, setDraftBase] = useState("");
  const [draftKey, setDraftKey] = useState("");

  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [sttAvailable, setSttAvailable] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(false);

  const recognizerRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const holdingRef = useRef(false);
  const transcriptRef = useRef("");
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setDraftBase(loaded.apiBaseUrl);
    setDraftKey(loaded.apiKey);
    setSttAvailable(speechRecognitionSupported());
    setTtsAvailable(speechSynthesisSupported());
    // Warm voices list (Safari populates async).
    if (speechSynthesisSupported()) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const refreshHealth = useCallback(async (s: JarvisSettings) => {
    try {
      const data = await fetchHealth(s);
      setHealth(data);
    } catch {
      setHealth({ ok: false, error: "unreachable" });
    }
  }, []);

  useEffect(() => {
    void refreshHealth(settings);
  }, [settings, refreshHealth]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stopSpeaking();
      setPhase("thinking");
      setError("");
      setReply("");
      setMeta("");
      setMessage(trimmed);

      try {
        const data = await postChat(trimmed, settingsRef.current);
        if (!data.ok) {
          setError(
            data.error ||
              data.hint ||
              "chat failed — check Settings / API key",
          );
          setPhase("idle");
          return;
        }
        const out = data.reply || data.text || "";
        setReply(out);
        const bits: string[] = [];
        if (data.model) bits.push(data.model);
        if (data.toolsUsed?.length) {
          bits.push(data.toolsUsed.map((t) => t.name).join(", "));
        }
        if (data.missingSecrets?.length) {
          bits.push(`missing ${data.missingSecrets.join(", ")}`);
        }
        setMeta(bits.join(" · "));

        if (out && speechSynthesisSupported()) {
          setPhase("speaking");
          speakText(out);
          // Rough end detection — Safari has limited utterance events reliability.
          const approxMs = Math.min(20000, Math.max(1800, out.length * 55));
          window.setTimeout(() => {
            setPhase((p) => (p === "speaking" ? "idle" : p));
          }, approxMs);
        } else {
          setPhase("idle");
        }
        void refreshHealth(settingsRef.current);
      } catch (err) {
        setError(err instanceof Error ? err.message : "request failed");
        setPhase("idle");
      }
    },
    [refreshHealth],
  );

  const stopListening = useCallback(() => {
    holdingRef.current = false;
    const rec = recognizerRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      recognizerRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (phase === "thinking") return;
    stopSpeaking();
    setError("");
    setTranscript("");
    transcriptRef.current = "";

    if (!speechRecognitionSupported()) {
      setError(
        "This browser has no speech recognition. Type below instead (common on desktop Firefox).",
      );
      return;
    }

    holdingRef.current = true;
    setPhase("listening");

    const rec = createRecognizer({
      onInterim: (text) => {
        transcriptRef.current = text;
        setTranscript(text);
      },
      onFinal: (text) => {
        transcriptRef.current = text;
        setTranscript(text);
      },
      onError: (code) => {
        if (!holdingRef.current) return;
        setError(
          code === "not-allowed"
            ? "Microphone blocked — allow mic for this site in Safari Settings."
            : `Speech error: ${code}`,
        );
      },
      onEnd: () => {
        // iOS often ends recognition early; restart while still holding.
        if (holdingRef.current && recognizerRef.current) {
          try {
            recognizerRef.current.start();
            return;
          } catch {
            /* fall through */
          }
        }
      },
    });

    if (!rec) {
      setPhase("idle");
      setError("Could not start speech recognition.");
      return;
    }

    recognizerRef.current = rec;
    try {
      rec.start();
    } catch {
      setPhase("idle");
      setError("Could not start microphone. Try again or use text.");
      holdingRef.current = false;
    }
  }, [phase]);

  const finishHold = useCallback(() => {
    if (!holdingRef.current && phase !== "listening") return;
    holdingRef.current = false;
    const text = transcriptRef.current.trim();
    stopListening();
    if (text) {
      void sendMessage(text);
    } else {
      setPhase("idle");
      setError("No speech heard — hold longer, or type below.");
    }
  }, [phase, sendMessage, stopListening]);

  function onTextSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(message);
  }

  function persistSettings(e: FormEvent) {
    e.preventDefault();
    const next = {
      apiBaseUrl: draftBase.trim(),
      apiKey: draftKey.trim(),
    };
    saveSettings(next);
    setSettings(next);
    setSettingsOpen(false);
  }

  const statusLabel =
    phase === "listening"
      ? "Listening…"
      : phase === "thinking"
        ? "Thinking…"
        : phase === "speaking"
          ? "Speaking…"
          : sttAvailable
            ? "Hold to talk"
            : "Type a message";

  return (
    <main className="voice-shell">
      <header className="voice-hero">
        <p className="voice-brand">Jarvis</p>
        <p className="voice-tagline">
          Hold the orb to speak. Works in Safari on iPhone — no TestFlight
          required.
        </p>
        <div className="voice-nav">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setDraftBase(settings.apiBaseUrl);
              setDraftKey(settings.apiKey);
              setSettingsOpen((v) => !v);
              setTipsOpen(false);
            }}
          >
            Settings
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setTipsOpen((v) => !v);
              setSettingsOpen(false);
            }}
          >
            Home Screen
          </button>
        </div>
      </header>

      {settingsOpen && (
        <section className="panel" aria-label="Settings">
          <h2 className="panel-title">Connection</h2>
          <p className="panel-copy">
            Stored only in this browser&apos;s localStorage. Leave base URL blank
            when you open Jarvis on its own published URL.
          </p>
          <form onSubmit={persistSettings} className="settings-form">
            <label className="field">
              <span>API base URL</span>
              <input
                value={draftBase}
                onChange={(e) => setDraftBase(e.target.value)}
                placeholder="https://jarvis-286b.apps.grok.bot"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <label className="field">
              <span>JARVIS_API_KEY</span>
              <input
                type="password"
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="same value bound on the host"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <div className="row-actions">
              <button type="submit" className="primary-btn">
                Save
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {tipsOpen && (
        <section className="panel" aria-label="Add to Home Screen">
          <h2 className="panel-title">Add to Home Screen</h2>
          <ol className="tips-list">
            <li>Open this page in <strong>Safari</strong> (not Chrome-in-app).</li>
            <li>Tap the Share button (square with arrow).</li>
            <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
            <li>Name it Jarvis → Add. Launch from the icon like an app.</li>
            <li>
              Host must be <strong>public</strong> + bind{" "}
              <code>JARVIS_API_KEY</code>; enter that key in Settings here.
            </li>
          </ol>
          <p className="panel-copy muted-tight">
            Mic works only over HTTPS. First hold prompts for microphone access —
            choose Allow.
          </p>
        </section>
      )}

      <section className="health-line" aria-live="polite">
        {health == null
          ? "Checking brain…"
          : health.ok
            ? `Online · Gemini ${health.geminiReady ? "ready" : "sample"} · HA ${health.haReady ? "ready" : "hold"} · key ${health.apiKeyRequired ? (settings.apiKey ? "set" : "needed") : "open"}`
            : `Offline — ${health.error || "check Settings / public publish"}`}
      </section>

      <section className="orb-stage">
        <div
          className={`orb-rings ${phase === "listening" ? "is-listening" : ""} ${phase === "thinking" ? "is-thinking" : ""} ${phase === "speaking" ? "is-speaking" : ""}`}
          aria-hidden
        >
          <span />
          <span />
          <span />
        </div>
        <button
          type="button"
          className={`orb-btn ${phase === "listening" ? "active" : ""}`}
          disabled={phase === "thinking"}
          aria-label={statusLabel}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
            startListening();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            finishHold();
          }}
          onPointerCancel={() => finishHold()}
          onPointerLeave={() => {
            if (holdingRef.current) finishHold();
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="orb-core" />
          <span className="orb-label">{statusLabel}</span>
        </button>
        {!sttAvailable && (
          <p className="stt-fallback">
            Speech recognition unavailable here — use the text box. Safari on
            iPhone supports hold-to-talk.
          </p>
        )}
        {ttsAvailable && phase === "speaking" && (
          <button
            type="button"
            className="ghost-btn stop-speak"
            onClick={() => {
              stopSpeaking();
              setPhase("idle");
            }}
          >
            Stop speaking
          </button>
        )}
      </section>

      {(transcript || phase === "listening") && (
        <p className="transcript" aria-live="polite">
          {transcript || "…"}
        </p>
      )}

      <form className="text-form" onSubmit={onTextSubmit}>
        <label htmlFor="jarvis-message" className="sr-only">
          Message
        </label>
        <textarea
          id="jarvis-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Or type a message…"
        />
        <button
          type="submit"
          className="primary-btn"
          disabled={phase === "thinking" || !message.trim()}
        >
          {phase === "thinking" ? "Thinking…" : "Send"}
        </button>
      </form>

      {(reply || error) && (
        <section className="reply-block" aria-live="polite">
          {error && <p className="error-text">{error}</p>}
          {reply && <p className="reply-text">{reply}</p>}
          {meta && <p className="meta-text">{meta}</p>}
        </section>
      )}

      <footer className="voice-foot">
        <p>
          Voice uses the Web Speech API on-device, then{" "}
          <code>POST /api/chat</code>. Same brain as the native iOS app.
        </p>
        <p>
          Safari tip: if recognition cuts out early, keep holding — it restarts
          while pressed. Desktop Chrome works too.
        </p>
      </footer>
    </main>
  );
}
