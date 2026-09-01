/**
 * Typed error envelope shared by every call through apiFetch.
 * Backend contract: error responses are JSON `{ code, message, details? }`.
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
    public status?: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Fired when the API client gives up on the session — refresh failed and
 * we've already wiped local session state. The caller is about to be
 * redirected to /login by the route guard; the empty message keeps any
 * transient inline rendering quiet during the brief redirect frame.
 */
export class UnauthorizedError extends ApiError {
  constructor() {
    super("UNAUTHORIZED", "", undefined, 401)
    this.name = "UnauthorizedError"
  }
}

export class NetworkError extends ApiError {
  constructor(cause: unknown) {
    super("NETWORK", "Network error", cause)
    this.name = "NetworkError"
  }
}
