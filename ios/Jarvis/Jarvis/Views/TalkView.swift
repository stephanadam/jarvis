import SwiftUI

struct TalkView: View {
    @EnvironmentObject private var session: JarvisSession
    @State private var typed = ""
    @State private var pulse = false

    var body: some View {
        ZStack {
            JarvisBackground()

            VStack(spacing: 0) {
                header
                transcriptList
                Spacer(minLength: 12)
                liveLine
                holdButton
                typedBar
                footerStatus
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 10)
        }
        .sheet(isPresented: $session.showSettings) {
            SettingsView()
                .environmentObject(session)
        }
        .task {
            await session.preparePermissions()
        }
        .onReceive(Timer.publish(every: 0.12, on: .main, in: .common).autoconnect()) { _ in
            if session.isRecording {
                session.refreshLiveTranscript()
            }
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text("JARVIS")
                    .font(.system(size: 28, weight: .semibold, design: .serif))
                    .tracking(4)
                    .foregroundStyle(JarvisTheme.brass)
                Text("Voice link")
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(JarvisTheme.muted)
            }
            Spacer()
            Button {
                session.showSettings = true
            } label: {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(JarvisTheme.brass)
                    .padding(10)
                    .background(Circle().fill(JarvisTheme.panel.opacity(0.7)))
            }
            .accessibilityLabel("Settings")
        }
        .padding(.bottom, 8)
    }

    private var transcriptList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    ForEach(session.turns) { turn in
                        turnRow(turn)
                            .id(turn.id)
                    }
                }
                .padding(.vertical, 8)
            }
            .onChange(of: session.turns.count) { _, _ in
                if let last = session.turns.last?.id {
                    withAnimation(.easeOut(duration: 0.25)) {
                        proxy.scrollTo(last, anchor: .bottom)
                    }
                }
            }
        }
        .frame(maxHeight: .infinity)
    }

    private func turnRow(_ turn: ChatTurn) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label(for: turn.role))
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .tracking(1.2)
                .foregroundStyle(color(for: turn.role))
            Text(turn.text)
                .font(.system(size: 16, weight: .regular, design: .rounded))
                .foregroundStyle(JarvisTheme.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 4)
    }

    private var liveLine: some View {
        Group {
            if session.isRecording || !session.liveTranscript.isEmpty {
                Text(session.liveTranscript.isEmpty ? "…" : session.liveTranscript)
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(JarvisTheme.brass.opacity(0.9))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 6)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: session.liveTranscript)
    }

    private var holdButton: some View {
        VStack(spacing: 10) {
            Text(session.isRecording ? "Release to send" : "Hold to talk")
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(JarvisTheme.muted)

            ZStack {
                Circle()
                    .stroke(JarvisTheme.brass.opacity(session.isRecording ? 0.55 : 0.22), lineWidth: 2)
                    .frame(width: 118, height: 118)
                    .scaleEffect(session.isRecording && pulse ? 1.08 : 1.0)
                    .animation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: pulse)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                session.isRecording ? JarvisTheme.brass : JarvisTheme.panel,
                                JarvisTheme.deep,
                            ],
                            center: .center,
                            startRadius: 4,
                            endRadius: 70
                        )
                    )
                    .frame(width: 96, height: 96)
                    .shadow(color: JarvisTheme.brass.opacity(session.isRecording ? 0.35 : 0.12), radius: 18, y: 4)

                Image(systemName: session.isRecording ? "waveform" : "mic.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(session.isRecording ? JarvisTheme.deep : JarvisTheme.brass)
                    .symbolEffect(.variableColor.iterative, isActive: session.isRecording)
            }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !session.isRecording && !session.isBusy {
                            pulse = true
                            Task { await session.beginHoldToTalk() }
                        }
                    }
                    .onEnded { _ in
                        pulse = false
                        Task { await session.endHoldToTalk() }
                    }
            )
            .disabled(session.isBusy && !session.isRecording)
            .opacity(session.isBusy && !session.isRecording ? 0.55 : 1)
            .accessibilityLabel("Hold to talk")
        }
        .padding(.vertical, 8)
    }

    private var typedBar: some View {
        HStack(spacing: 10) {
            TextField("Or type a message", text: $typed)
                .textInputAutocapitalization(.sentences)
                .disableAutocorrection(false)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(JarvisTheme.panel.opacity(0.85))
                )
                .foregroundStyle(JarvisTheme.ink)

            Button {
                let text = typed
                typed = ""
                Task { await session.sendTyped(text) }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(JarvisTheme.brass)
            }
            .disabled(typed.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || session.isBusy)
        }
    }

    private var footerStatus: some View {
        VStack(spacing: 4) {
            Text(session.statusText)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(JarvisTheme.muted)
            if let error = session.lastError {
                Text(error)
                    .font(.system(size: 12, weight: .regular, design: .rounded))
                    .foregroundStyle(Color(red: 0.85, green: 0.45, blue: 0.38))
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.top, 8)
        .frame(maxWidth: .infinity)
    }

    private func label(for role: ChatTurn.Role) -> String {
        switch role {
        case .user: return "YOU"
        case .jarvis: return "JARVIS"
        case .system: return "SYSTEM"
        }
    }

    private func color(for role: ChatTurn.Role) -> Color {
        switch role {
        case .user: return JarvisTheme.muted
        case .jarvis: return JarvisTheme.brass
        case .system: return Color(red: 0.75, green: 0.55, blue: 0.45)
        }
    }
}

struct JarvisBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [JarvisTheme.deep, Color(red: 0.07, green: 0.09, blue: 0.11), JarvisTheme.deep],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            RadialGradient(
                colors: [JarvisTheme.brass.opacity(0.14), .clear],
                center: .top,
                startRadius: 20,
                endRadius: 380
            )
            RadialGradient(
                colors: [Color(red: 0.15, green: 0.22, blue: 0.28).opacity(0.45), .clear],
                center: UnitPoint(x: 0.85, y: 0.75),
                startRadius: 10,
                endRadius: 280
            )
        }
        .ignoresSafeArea()
    }
}

enum JarvisTheme {
    static let deep = Color(red: 0.05, green: 0.06, blue: 0.07)
    static let panel = Color(red: 0.12, green: 0.14, blue: 0.16)
    static let brass = Color(red: 0.78, green: 0.64, blue: 0.36)
    static let ink = Color(red: 0.92, green: 0.90, blue: 0.86)
    static let muted = Color(red: 0.62, green: 0.60, blue: 0.55)
}
