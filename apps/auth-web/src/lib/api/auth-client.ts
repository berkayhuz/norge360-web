"use client"

import { parseProblemResponse } from "./problem"

type AuthRequestOptions = {
  body?: unknown
  method?: "DELETE" | "GET" | "POST"
  timeoutMs?: number
}

export async function authRequest<TResponse>(
  path: string,
  options: AuthRequestOptions = {}
): Promise<TResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 15_000
  )

  try {
    const headers = new Headers({
      Accept: "application/json",
      "X-Correlation-Id": crypto.randomUUID(),
      "X-Norge360-Culture": resolveCulture(),
    })

    const hasBody = options.body !== undefined
    if (hasBody) {
      headers.set("Content-Type", "application/json")
    }

    const response = await fetch(`/api/auth${path}`, {
      body: hasBody ? JSON.stringify(options.body) : undefined,
      credentials: "include",
      headers,
      method: options.method ?? "GET",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw await parseProblemResponse(response)
    }

    if (response.status === 204) {
      return undefined as TResponse
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return undefined as TResponse
    }

    return (await response.json()) as TResponse
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.")
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function resolveCulture() {
  const locale =
    document.documentElement.lang || window.navigator.language || "tr-TR"

  return locale.toLowerCase().startsWith("tr") ? "tr-TR" : "en-US"
}
