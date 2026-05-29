import { cookies, headers } from "next/headers"

import { tryGetServerEnv } from "@/src/lib/env/server"

import type {
  AuthSessionStatusResponse,
} from "./types"

export async function getCurrentSession() {
  const response =
    await serverAuthRequest<AuthSessionStatusResponse>("/session-status")

  if (!response.ok) {
    return null
  }

  return response.data
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
