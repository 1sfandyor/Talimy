import { getApiOrigin } from "@/config/site"
import { getStoredAuthTokens } from "@/lib/auth"

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api`
}

export function getWebApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`
  }

  return "/api"
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | object | null
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
  return apiFetchWithBaseUrl<T>(url, options)
}

export async function webApiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = path.startsWith("http") ? path : `${getWebApiBaseUrl()}${normalizedPath}`
  return apiFetchWithBaseUrl<T>(url, options)
}

async function apiFetchWithBaseUrl<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has("authorization")) {
    const tokens = getStoredAuthTokens()
    if (tokens?.accessToken) {
      headers.set("authorization", `Bearer ${tokens.accessToken}`)
    }
  }

  let body: BodyInit | undefined
  if (typeof options.body === "undefined" || options.body === null) {
    body = undefined
  } else if (options.body instanceof FormData || typeof options.body === "string") {
    body = options.body
  } else {
    headers.set("content-type", "application/json")
    body = JSON.stringify(options.body)
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
    cache: options.cache ?? "no-store",
  })

  const contentType = response.headers.get("content-type") ?? ""
  const parsed = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "")

  if (!response.ok) {
    const errorMessageFromEnvelope =
      parsed &&
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "object" &&
      (parsed as { error: Record<string, unknown> }).error !== null &&
      "message" in (parsed as { error: Record<string, unknown> }).error
        ? String((parsed as { error: Record<string, unknown> }).error.message)
        : null
    const message =
      errorMessageFromEnvelope ??
      (parsed && typeof parsed === "object" && parsed !== null && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : `Request failed with status ${response.status}`)
    throw new ApiError(message, response.status, parsed)
  }

  return parsed as T
}
