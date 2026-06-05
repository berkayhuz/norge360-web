import { cookies, headers } from "next/headers"

import { tryGetServerEnv } from "@/src/lib/env/server"

import type {
  AuthSessionStatusResponse,
} from "./types"

type GetMyProfileUsernameResult =
  | { kind: "success"; username: string }
  | { kind: "pending" }
  | { kind: "unauthorized" }
  | { kind: "notFound" }
  | { kind: "upstreamError"; status?: number }

export async function getCurrentSession() {
  const response =
    await serverAuthRequest<AuthSessionStatusResponse>("/session-status")

  if (!response.ok) {
    return null
  }

  return response.data
}

export async function getMyProfileUsername(
  options?: { attempts?: number; delayMs?: number }
): Promise<GetMyProfileUsernameResult> {
  const attempts = Math.max(1, options?.attempts ?? 10)
  const delayMs = Math.max(0, options?.delayMs ?? 1_000)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await serverGatewayRequest<unknown>("/api/accounts/profiles/me")

    if (response.ok) {
      const username = readString(response.data, "username", "Username")
      if (username) {
        return { kind: "success", username }
      }

      return { kind: "upstreamError", status: 200 }
    }

    if (response.status === 202) {
      if (attempt < attempts) {
        await sleep(delayMs)
        continue
      }

      return { kind: "pending" }
    }

    if (response.status === 401 || response.status === 403) {
      return { kind: "unauthorized" }
    }

    if (response.status === 404) {
      return { kind: "notFound" }
    }

    if (response.status && response.status >= 500 && attempt < attempts) {
      await sleep(delayMs)
      continue
    }

    return { kind: "upstreamError", status: response.status }
  }

  return { kind: "pending" }
}

async function serverAuthRequest<TResponse>(path: string) {
  const { env } = tryGetServerEnv()
  if (!env) {
    return { ok: false as const, status: 500 }
  }

  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const upstreamUrl = new URL(`/api/auth${path}`, env.authApiBaseUrl)
  const response = await fetch(upstreamUrl, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      cookie: cookieStore.toString(),
      origin: new URL(env.authWebAppUrl).origin,
      referer: env.authWebAppUrl,
      "x-correlation-id":
        requestHeaders.get("x-correlation-id") ?? crypto.randomUUID(),
    },
  })

  if (!response.ok) {
    return { ok: false as const, status: response.status }
  }

  return { data: (await response.json()) as TResponse, ok: true as const }
}

async function serverGatewayRequest<TResponse>(path: string) {
  const { env } = tryGetServerEnv()
  if (!env) {
    return { ok: false as const, status: 500 }
  }

  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const upstreamUrl = new URL(path, env.authApiBaseUrl)
  const response = await fetch(upstreamUrl, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      cookie: cookieStore.toString(),
      origin: new URL(env.authWebAppUrl).origin,
      referer: env.authWebAppUrl,
      "x-correlation-id":
        requestHeaders.get("x-correlation-id") ?? crypto.randomUUID(),
    },
  })

  if (!response.ok) {
    return { ok: false as const, status: response.status }
  }

  return { data: (await response.json()) as TResponse, ok: true as const }
}

function readString(source: unknown, ...keys: string[]) {
  if (!source || typeof source !== "object") {
    return null
  }

  const record = source as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
