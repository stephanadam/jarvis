import Foundation
import SwiftUI

@MainActor
final class JarvisSession: ObservableObject {
    @Published var turns: [ChatTurn] = []
    @Published var liveTranscript: String = ""
    @Published var statusText: String = "Hold to talk"
    @Published var isBusy = false
    @Published var isRecording = false
    @Published var lastError: String?
    @Published var showSettings = false

    @Published var draftBaseURL: String = AppSettings.baseURL
    @Published var draftAPIKey: String = AppSettings.apiKey

    let speech = SpeechRecognizer()
    let tts = SpeechSynthesizer()
    private let api = JarvisAPIClient()

    func preparePermissions() async {
        _ = await speech.requestPermissions()
        if let message = speech.authorizationMessage {
            lastError = message
            statusText = "Permissions needed"
        }
    }

    func beginHoldToTalk() async {
        guard !isBusy else { return }
        lastError = nil
        tts.stop()
        liveTranscript = ""
        statusText = "Listening…"

        let ok = await speech.requestPermissions()
        guard ok else {
            lastError = speech.authorizationMessage
            statusText = "Permissions needed"
            return
        }

        do {
            try speech.start()
            isRecording = true
        } catch {
            lastError = error.localizedDescription
            statusText = "Mic failed"
            isRecording = false
        }
    }

    func refreshLiveTranscript() {
        liveTranscript = speech.transcript
    }

    func endHoldToTalk() async {
        guard isRecording || speech.isRecording else { return }
        let text = speech.stop()
        isRecording = false
        liveTranscript = text

        guard !text.isEmpty else {
            statusText = "Hold to talk"
            lastError = "Didn't catch that — try again."
            return
        }

        append(.init(role: .user, text: text))
        await sendToBrain(text)
    }

    func sendTyped(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isBusy else { return }
        append(.init(role: .user, text: trimmed))
        liveTranscript = ""
        await sendToBrain(trimmed)
    }

    func saveSettings() {
        AppSettings.baseURL = draftBaseURL
        AppSettings.apiKey = draftAPIKey
        draftBaseURL = AppSettings.baseURL
        draftAPIKey = AppSettings.apiKey
        showSettings = false
        statusText = "Settings saved"
    }

    func checkHealth() async {
        isBusy = true
        statusText = "Checking…"
        lastError = nil
        defer {
            isBusy = false
        }
        do {
            let health = try await api.health(baseURL: AppSettings.baseURL, apiKey: AppSettings.apiKey)
            let gemini = health.geminiReady == true ? "Gemini ready" : "Gemini sample/missing"
            let key = health.apiKeyRequired == true ? "API key required" : "API key optional"
            statusText = "OK — \(gemini); \(key)"
            append(.init(role: .system, text: statusText))
        } catch {
            lastError = error.localizedDescription
            statusText = "Health failed"
        }
    }

    private func sendToBrain(_ message: String) async {
        isBusy = true
        statusText = "Thinking…"
        lastError = nil
        defer { isBusy = false }

        do {
            let reply = try await api.chat(
                message: message,
                baseURL: AppSettings.baseURL,
                apiKey: AppSettings.apiKey
            )
            append(.init(role: .jarvis, text: reply))
            statusText = "Hold to talk"
            tts.speak(reply)
        } catch {
            lastError = error.localizedDescription
            statusText = "Hold to talk"
            append(.init(role: .system, text: "Error: \(error.localizedDescription)"))
        }
    }

    private func append(_ turn: ChatTurn) {
        turns.append(turn)
    }
}
