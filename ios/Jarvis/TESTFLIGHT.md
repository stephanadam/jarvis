# Jarvis → TestFlight checklist (Steve)

Cloud agents **cannot** finish this. You need a Mac, Xcode, and an Apple Developer account.

## 1. Apple Developer Program

1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/) (~USD 99/year).
2. Wait until membership is **Active** (can take up to ~48h after payment).
3. Note your **Team ID** (Membership details). Xcode signing uses this Team; leave Bundle ID `com.stephanadam.jarvis` unless it’s taken.

## 2. App Store Connect app record

1. Open [App Store Connect](https://appstoreconnect.apple.com/) → **My Apps** → **+** → **New App**.
2. Platforms: **iOS**.
3. Name: e.g. `Jarvis` (must be unique in the store listing sense).
4. Bundle ID: register `com.stephanadam.jarvis` if prompted (Certificates, Identifiers & Profiles → Identifiers).
5. SKU: e.g. `jarvis-ios-1`.
6. Access: Full Access.

You do **not** need App Review / public App Store release for internal TestFlight.

## 3. Xcode archive

1. `open ios/Jarvis/Jarvis.xcodeproj`
2. Signing: your Team, automatic signing.
3. Add a 1024×1024 App Icon in `Assets.xcassets` → AppIcon (required for archive).
4. Destination: **Any iOS Device (arm64)** (not Simulator).
5. Product → **Archive**.
6. Organizer → select archive → **Distribute App** → **App Store Connect** → Upload.
7. Wait for processing email / App Store Connect **TestFlight** tab.

Optional CLI (after signing works in Xcode once):

```bash
xcodebuild -project ios/Jarvis/Jarvis.xcodeproj \
  -scheme Jarvis -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/Jarvis.xcarchive archive

xcodebuild -exportArchive \
  -archivePath build/Jarvis.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ios/Jarvis/ExportOptions.plist
```

`ExportOptions.plist` is a template — set your Team ID before using CLI upload.

## 4. TestFlight internal testing

1. App Store Connect → your app → **TestFlight**.
2. After the build processes, add it to **Internal Testing**.
3. **Internal testers** must be App Store Connect Users (Admin/Developer/Marketing/App Manager) with access to the app — **invite yourself** if you are not already a user on the team.
4. On iPhone: install **TestFlight**, accept the invite, install **Jarvis**.
5. In Jarvis Settings: confirm base URL + API key (see README auth section).
6. Hold to talk.

Compliance questions (export encryption, etc.): for this MVP using HTTPS + Apple STT/TTS only, standard answers usually apply (e.g. HTTPS exempt encryption). Read Apple’s prompts; don’t guess legal advice.

## 5. What this cloud PR already did

- Scaffolded the Xcode project and voice pipeline.
- Documented the **private app auth blocker** and `JARVIS_API_KEY` path.
- Cannot: create your Apple Team, generate certificates on your account, or upload the binary.

## Quick “am I stuck?”

| Symptom | Fix |
| --- | --- |
| `sign_in_required` in app | Publish brain as **public** + set `JARVIS_API_KEY` |
| Signing errors in Xcode | Paid Developer membership + Team selected |
| No TestFlight build | Archive for **Any iOS Device**, upload, wait for processing |
| Mic permission denied | iOS Settings → Jarvis → Microphone + Speech Recognition |
