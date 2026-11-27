/** Browser-side Jarvis settings + chat helpers (localStorage). */

export const STORAGE_BASE_URL = "jarvis.apiBaseUrl";
export const STORAGE_API_KEY = "jarvis.apiKey";

export type JarvisSettings = {
  apiBaseUrl: string;
  apiKey: string;
};

export function loadSettings(): JarvisSettings {
  if (typeof window === "undefined") {
    return { apiBaseUrl: "", apiKey: "" };
  }
  return {
    apiBaseUrl: (localStorage.getItem(STORAGE_BASE_URL) || "").trim(),
    apiKey: (localStorage.getItem(STORAGE_API_KEY) || "").trim(),
  };
}

export function saveSettings(next: JarvisSettings): void {
  localStorage.setItem(STORAGE_BASE_URL, next.apiBaseUrl.trim());
  localStorage.setItem(STORAGE_API_KEY, next.apiKey.trim());
}

/** Resolve API origin: empty / relative → same origin. */
export function resolveApiRoot(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    return u.origin;
  } catch {
    return trimmed;
  }
}

export function apiUrl(path: string, baseUrl: string): string {
  const root = resolveApiRoot(baseUrl);
  const p = path.startsWith("/") ? path : `/${path}`;
  return root ? `${root}${p}` : p;
}

export function authHeaders(apiKey: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey.trim()) {
    headers["X-Jarvis-Key"] = apiKey.trim();
  }
  return headers;
}

export type HealthPayload = {
  ok: boolean;
  geminiReady?: boolean;
  haReady?: boolean;
  apiKeyRequired?: boolean;
  secrets?: Record<string, boolean>;
  capabilities?: Array<{ id: string; status: string }>;
  error?: string;
};

export type ChatPayload = {
  ok: boolean;
  reply?: string;
  text?: string;
  model?: string;
  error?: string;
  missingSecrets?: string[];
  toolsUsed?: Array<{ name: string }>;
  hint?: string;
};

export async function fetchHealth(settings: JarvisSettings): Promise<HealthPayload> {
  const res = await fetch(apiUrl("/api/health", settings.apiBaseUrl), {
    headers: authHeaders(settings.apiKey),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as HealthPayload;
  if (!res.ok) {
    return {
      ok: false,
      error:
        data.error ||
        (res.status === 401
          ? "api_key_required — set JARVIS_API_KEY in Settings"
          : `HTTP ${res.status}`),
      apiKeyRequired: data.apiKeyRequired,
    };
  }
  return data;
}

export async function postChat(
  message: string,
  settings: JarvisSettings,
): Promise<ChatPayload> {
  const res = await fetch(apiUrl("/api/chat", settings.apiBaseUrl), {
    method: "POST",
    headers: {
      ...authHeaders(settings.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  const data = (await res.json().catch(() => ({}))) as ChatPayload;
  if (!res.ok && !data.error) {
    data.ok = false;
    data.error =
      res.status === 401
        ? "api_key_required — open Settings and enter your JARVIS_API_KEY"
        : `HTTP ${res.status}`;
  }
  return data;
}

/* ——— Speech helpers ——— */

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function speechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function createRecognizer(opts: {
  lang?: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}): SpeechRecognitionLike | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = opts.lang || "en-US";

  let finals = "";

  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i]![0]!.transcript;
      if (event.results[i]!.isFinal) {
        finals += `${piece} `;
        opts.onFinal?.(finals.trim());
      } else {
        interim += piece;
      }
    }
    const live = `${finals}${interim}`.trim();
    if (live) opts.onInterim?.(live);
  };

  rec.onerror = (event) => {
    const code = event.error || "speech_error";
    if (code === "aborted" || code === "no-speech") return;
    opts.onError?.(code);
  };

  rec.onend = () => {
    opts.onEnd?.();
  };

  return rec;
}

export function speakText(text: string): void {
  if (!speechSynthesisSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.trim());
  utter.rate = 1.02;
  utter.pitch = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /en(-|_)GB/i.test(v.lang) && /daniel|arthur|rishi|male/i.test(v.name)) ||
    voices.find((v) => /en(-|_)GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang));
  if (preferred) utter.voice = preferred;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (speechSynthesisSupported()) window.speechSynthesis.cancel();
}
