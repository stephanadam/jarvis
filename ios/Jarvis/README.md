# Jarvis iOS (voice MVP)

Native **SwiftUI** hold-to-talk client for Steve’s Jarvis HTTP brain.

| Piece | Choice |
| --- | --- |
| UI | SwiftUI, brass-on-charcoal (not purple AI cliché) |
| STT | Apple Speech (`SFSpeechRecognizer`) |
| TTS | `AVSpeechSynthesizer` |
| Brain | `POST {baseURL}/api/chat` with `{ "message": "…" }` |
| Bundle ID | `com.stephanadam.jarvis` |
| Default URL | `https://jarvis-286b.apps.grok.bot` |

This cloud environment **cannot** build or upload to TestFlight (no macOS / Xcode / Apple credentials). Steve builds on a Mac.

## Open in Xcode

1. On a Mac with Xcode 15+ (iOS 17 SDK):
   ```bash
   git clone https://github.com/stephanadam/jarvis.git
   cd jarvis
   open ios/Jarvis/Jarvis.xcodeproj
   ```
2. Select the **Jarvis** target → **Signing & Capabilities**.
3. Check **Automatically manage signing**, pick your **Team** (Apple Developer).
4. Confirm Bundle Identifier `com.stephanadam.jarvis` (change only if that ID is taken).
5. Plug in an iPhone (or use Simulator for typed chat; mic/STT need a device or Simulator mic).
6. Product → Run.

First launch: allow **Microphone** and **Speech Recognition**.

## Talking to the brain

1. Hold the mic → speak → release.
2. App transcribes, calls `/api/chat`, shows the reply, speaks it.
3. Settings (slider icon): base URL + optional API key; **Ping /api/health**.

Typed messages work without the mic.

## Auth: private Cursor app vs phone

**Verified against the live host:** unauthenticated `POST /api/chat` returns
`401 {"error":"sign_in_required"}`. `GET /api/health` returns an HTML “Open this
app” gate. That gate is **Cursor publish-app private/team auth**, not Jarvis
code. An iPhone app cannot complete Cursor browser login / session cookies in a
practical MVP way.

| Option | Works for iPhone? | Notes |
| --- | --- | --- |
| Keep app **private** | **No** (blocker) | Phone gets `sign_in_required` before Next.js runs |
| Publish app as **public** + set secret `JARVIS_API_KEY` | **Yes** (recommended) | Brain middleware requires `X-Jarvis-Key` / `Authorization: Bearer`; set the same value in the iOS Settings sheet |
| Public with **no** API key | Yes, but open | Anyone who finds the URL can chat; only for brief tests |
| Edge proxy that injects a Cursor session | Fragile | Not scaffolded; avoid |

**Honest blocker:** until the hosted app is reachable without Cursor sign-in (public
+ API key, or another public URL), the iOS app will show a clear auth error
after you hold-to-talk.

### Recommended Steve path

1. In Cursor, change publish-app visibility to **public** (or republish public).
2. Create a long random `JARVIS_API_KEY` in Cursor Secrets (do **not** paste into chat).
3. Redeploy / republish so middleware sees the secret.
4. In the iPhone app Settings, paste that same key (Keychain-backed on device).
5. Ping health, then talk.

HA secrets are optional for chat; Gemini alone is enough for the voice MVP.

## Local brain (optional)

```bash
# repo root
npm install && npm run dev
# iOS Settings → base URL http://<your-mac-lan-ip>:3000
# Optional: JARVIS_API_KEY in .env.local
```

Simulator → Mac `localhost` works as `http://127.0.0.1:3000`. Physical iPhone needs the Mac’s LAN IP and App Transport / cleartext only if you use `http` (prefer a tunnel or the published HTTPS URL).

## TestFlight

See [TESTFLIGHT.md](./TESTFLIGHT.md). Requires Steve’s **Apple Developer Program**
membership (~$99/year). Cloud agents cannot complete App Store Connect upload
without his Apple ID / certificates.
