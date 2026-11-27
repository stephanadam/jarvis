import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var session: JarvisSession
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("https://jarvis-286b.apps.grok.bot", text: $session.draftBaseURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                } header: {
                    Text("Brain base URL")
                } footer: {
                    Text("Default is the Cursor publish-app. Private apps return sign_in_required to the phone — publish as public and set JARVIS_API_KEY, or point at a reachable URL.")
                }

                Section {
                    SecureField("Optional API key", text: $session.draftAPIKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("API key")
                } footer: {
                    Text("Sent as X-Jarvis-Key and Authorization: Bearer. Must match the JARVIS_API_KEY secret on the server when that secret is set.")
                }

                Section("Checks") {
                    Button("Ping /api/health") {
                        Task {
                            AppSettings.baseURL = session.draftBaseURL
                            AppSettings.apiKey = session.draftAPIKey
                            await session.checkHealth()
                        }
                    }
                }

                Section("About") {
                    LabeledContent("Bundle ID", value: "com.stephanadam.jarvis")
                    LabeledContent("STT", value: "Apple Speech")
                    LabeledContent("TTS", value: "AVSpeechSynthesizer")
                }
            }
            .scrollContentBackground(.hidden)
            .background(JarvisTheme.deep.ignoresSafeArea())
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { session.saveSettings() }
                        .fontWeight(.semibold)
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            session.draftBaseURL = AppSettings.baseURL
            session.draftAPIKey = AppSettings.apiKey
        }
    }
}
