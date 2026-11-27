import Foundation

struct ChatResponse: Decodable {
    let ok: Bool?
    let reply: String?
    let text: String?
    let error: String?
    let model: String?
    let hint: String?
}

struct HealthResponse: Decodable {
    let ok: Bool?
    let service: String?
    let apiKeyRequired: Bool?
    let geminiReady: Bool?
    let haReady: Bool?
    let error: String?
}

enum JarvisAPIError: LocalizedError {
    case invalidURL
    case httpStatus(Int, String?)
    case signInRequired
    case apiKeyRequired
    case emptyReply
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Base URL is invalid."
        case .httpStatus(let code, let body):
            return "HTTP \(code)\(body.map { ": \($0)" } ?? "")"
        case .signInRequired:
            return "The hosted app is private (Cursor sign-in). Publish as public + JARVIS_API_KEY, or use a reachable public URL."
        case .apiKeyRequired:
            return "Server requires an API key. Set it in Settings (X-Jarvis-Key)."
        case .emptyReply:
            return "Jarvis returned an empty reply."
        case .transport(let error):
            return error.localizedDescription
        }
    }
}

final class JarvisAPIClient {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func health(baseURL: String, apiKey: String) async throws -> HealthResponse {
        let url = try endpoint(baseURL: baseURL, path: "/api/health")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        applyAuth(to: &request, apiKey: apiKey)
        return try await decode(HealthResponse.self, request: request)
    }

    func chat(message: String, baseURL: String, apiKey: String) async throws -> String {
        let url = try endpoint(baseURL: baseURL, path: "/api/chat")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        applyAuth(to: &request, apiKey: apiKey)
        let body = ["message": message]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let response = try await decode(ChatResponse.self, request: request)
        let reply = (response.reply ?? response.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if let error = response.error, !error.isEmpty, reply.isEmpty {
            throw JarvisAPIError.httpStatus(502, error)
        }
        guard !reply.isEmpty else { throw JarvisAPIError.emptyReply }
        return reply
    }

    private func applyAuth(to request: inout URLRequest, apiKey: String) {
        let trimmed = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        request.setValue(trimmed, forHTTPHeaderField: "X-Jarvis-Key")
        request.setValue("Bearer \(trimmed)", forHTTPHeaderField: "Authorization")
    }

    private func endpoint(baseURL: String, path: String) throws -> URL {
        var raw = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        while raw.hasSuffix("/") { raw.removeLast() }
        guard let url = URL(string: raw + path) else { throw JarvisAPIError.invalidURL }
        return url
    }

    private func decode<T: Decodable>(_ type: T.Type, request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw JarvisAPIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw JarvisAPIError.httpStatus(-1, "No HTTP response")
        }

        let text = String(data: data, encoding: .utf8) ?? ""
        if http.statusCode == 401 {
            if text.contains("sign_in_required") || text.contains("Open this app") {
                throw JarvisAPIError.signInRequired
            }
            if text.contains("api_key_required") {
                throw JarvisAPIError.apiKeyRequired
            }
            throw JarvisAPIError.httpStatus(401, truncate(text))
        }
        if http.statusCode == 403, text.contains("api_key_invalid") {
            throw JarvisAPIError.httpStatus(403, "API key rejected")
        }
        guard (200 ... 299).contains(http.statusCode) else {
            throw JarvisAPIError.httpStatus(http.statusCode, truncate(text))
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            // Private gate sometimes returns HTML with 200 for GET.
            if text.contains("sign_in_required") || text.contains("Open this app") {
                throw JarvisAPIError.signInRequired
            }
            throw JarvisAPIError.httpStatus(http.statusCode, "Invalid JSON: \(truncate(text))")
        }
    }

    private func truncate(_ text: String, limit: Int = 180) -> String {
        let compact = text.replacingOccurrences(of: "\n", with: " ")
        if compact.count <= limit { return compact }
        return String(compact.prefix(limit)) + "…"
    }
}
