import { NextRequest, NextResponse } from "next/server"

import { tryGetServerEnv, type ServerEnv } from "@/src/lib/env/server"

const DOCUMENTED_AUTH_ROUTES: Array<{
  method: string
  pattern: RegExp
}> = [
  { method: "POST", pattern: /^\/confirm-email$/ },
  { method: "POST", pattern: /^\/confirm-email-change$/ },
  { method: "POST", pattern: /^\/forgot-password$/ },
  { method: "POST", pattern: /^\/login$/ },
  { method: "POST", pattern: /^\/logout$/ },
  { method: "POST", pattern: /^\/refresh$/ },
  { method: "POST", pattern: /^\/register$/ },
  { method: "POST", pattern: /^\/resend-confirm-email$/ },
  { method: "POST", pattern: /^\/reset-password$/ },
  { method: "GET", pattern: /^\/session-status$/ },
]

const RESPONSE_HEADERS_TO_FORWARD = [
  "cache-control",
  "content-language",
  "content-type",
  "x-correlation-id",
]

type AuthProxyParams = {
  path: string[]
}

export async function proxyAuthRequest(
  request: NextRequest,
  params: AuthProxyParams
) {
  const { env, error } = tryGetServerEnv()

  if (!env) {
    return NextResponse.json(
      {
        title: "Auth web configuration error",
        status: 500,
        detail: error.issues.map((issue) => issue.message).join("; "),
        errorCode: "auth_web_config_invalid",
      },
      { status: 500 }
    )
  }

  const authPath = `/${params.path.join("/")}`
  if (!isAllowedAuthRoute(request.method, authPath)) {
    return NextResponse.json(
      {
        title: "Auth endpoint is not allowed",
        status: 404,
        errorCode: "auth_proxy_route_not_allowed",
      },
      { status: 404 }
    )
  }

  const upstreamUrl = new URL(`/api/auth${authPath}`, env.authApiBaseUrl)
  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      body: canHaveBody(request.method)
        ? await request.arrayBuffer()
        : undefined,
      cache: "no-store",
      headers: createForwardHeaders(request, env),
      method: request.method,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return NextResponse.json(
      {
        title: "Auth service unavailable",
        status: 503,
        detail: "Authentication service could not be reached.",
        errorCode: "auth_service_unavailable",
      },
      { status: 503 }
    )
  }

  return createProxyResponse(upstreamResponse, env, authPath)
}

function isAllowedAuthRoute(method: string, path: string) {
  return DOCUMENTED_AUTH_ROUTES.some(
    (route) => route.method === method.toUpperCase() && route.pattern.test(path)
  )
}

function canHaveBody(method: string) {
  return method !== "GET" && method !== "HEAD"
}

function createForwardHeaders(request: NextRequest, env: ServerEnv) {
  const headers = new Headers()
  const sourceHeaders = request.headers
  const contentType = sourceHeaders.get("content-type")
  const accept = sourceHeaders.get("accept")
  const acceptLanguage = sourceHeaders.get("accept-language")
  const cookie = sourceHeaders.get("cookie")
  const correlationId = sourceHeaders.get("x-correlation-id")
  const culture = sourceHeaders.get("x-norge360-culture")
  const userAgent = sourceHeaders.get("user-agent")

  if (accept) headers.set("accept", accept)
  if (acceptLanguage) headers.set("accept-language", acceptLanguage)
  if (contentType) headers.set("content-type", contentType)
  if (cookie) headers.set("cookie", cookie)
  if (correlationId) headers.set("x-correlation-id", correlationId)
  if (culture) headers.set("x-norge360-culture", culture)
  if (userAgent) headers.set("user-agent", userAgent)

  headers.set("origin", new URL(env.authWebAppUrl).origin)
  headers.set("referer", env.authWebAppUrl)

  return headers
}

async function createProxyResponse(
  upstreamResponse: Response,
  env: ServerEnv,
  authPath: string
) {
  const headers = new Headers()
  for (const header of RESPONSE_HEADERS_TO_FORWARD) {
    const value = upstreamResponse.headers.get(header)
    if (value) {
      headers.set(header, value)
    }
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? ""
  const hasJsonBody = contentType.includes("application/json")

  if (upstreamResponse.status === 204 || !hasJsonBody) {
    const response = new NextResponse(upstreamResponse.body, {
      headers,
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
    })
    forwardSetCookie(upstreamResponse, response)
    clearBodyTokenCookiesIfNeeded(response, env, authPath)
    return response
  }

  const payload = (await upstreamResponse.json().catch(() => null)) as unknown
  const response = NextResponse.json(sanitizeTokenPayload(payload), {
    headers,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  })

  forwardSetCookie(upstreamResponse, response)
  setBodyTokenCookiesIfPresent(response, payload, env)
  clearBodyTokenCookiesIfNeeded(response, env, authPath)

  return response
}

function forwardSetCookie(upstreamResponse: Response, response: NextResponse) {
  const getSetCookie = (
    upstreamResponse.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie
  const cookies = getSetCookie?.call(upstreamResponse.headers) ?? []

  if (cookies.length > 0) {
    for (const cookie of cookies) {
      response.headers.append("set-cookie", cookie)
    }
    return
  }

  const cookie = upstreamResponse.headers.get("set-cookie")
  if (cookie) {
    response.headers.append("set-cookie", cookie)
  }
}

function sanitizeTokenPayload(payload: unknown) {
  if (!isRecord(payload)) {
    return payload
  }

  const safe = { ...payload }
  delete safe.accessToken
  delete safe.refreshToken

  return safe
}

function setBodyTokenCookiesIfPresent(
  response: NextResponse,
  payload: unknown,
  env: ServerEnv
) {
  if (!isBodyTokenPayload(payload)) {
    return
  }

  const accessCookie = createCookiePolicy(
    env,
    "access",
    new Date(payload.accessTokenExpiresAt)
  )
  response.cookies.set(
    env.cookieNames.access,
    payload.accessToken,
    accessCookie
  )

  const refreshCookie = createCookiePolicy(
    env,
    "refresh",
    new Date(payload.refreshTokenExpiresAt)
  )
  response.cookies.set(
    env.cookieNames.refresh,
    payload.refreshToken,
    refreshCookie
  )

  const sessionCookie = createCookiePolicy(
    env,
    "session",
    new Date(payload.refreshTokenExpiresAt)
  )
  response.cookies.set(
    env.cookieNames.session,
    payload.sessionId,
    sessionCookie
  )
}

function clearBodyTokenCookiesIfNeeded(
  response: NextResponse,
  env: ServerEnv,
  authPath: string
) {
  if (
    authPath !== "/logout" &&
    authPath !== "/reset-password" &&
    authPath !== "/confirm-email-change"
  ) {
    return
  }

  response.cookies.set(
    env.cookieNames.access,
    "",
    createCookieDeletionPolicy(env, "access")
  )
  response.cookies.set(
    env.cookieNames.refresh,
    "",
    createCookieDeletionPolicy(env, "refresh")
  )
  response.cookies.set(
    env.cookieNames.session,
    "",
    createCookieDeletionPolicy(env, "session")
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isBodyTokenPayload(value: unknown): value is {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
  sessionId: string
} {
  return (
    isRecord(value) &&
    typeof value.accessToken === "string" &&
    typeof value.accessTokenExpiresAt === "string" &&
    typeof value.refreshToken === "string" &&
    typeof value.refreshTokenExpiresAt === "string" &&
    typeof value.sessionId === "string"
  )
}

type BodyTokenCookieKind = "access" | "refresh" | "session"

function createCookieBase(env: ServerEnv, kind: BodyTokenCookieKind) {
  const secure = env.isProduction || env.authWebAppUrl.startsWith("https://")

  return {
    domain: env.authCookieDomain || undefined,
    httpOnly: true,
    path: kind === "access" ? "/" : "/api/auth",
    sameSite: "lax" as const,
    secure,
  }
}

function createCookiePolicy(
  env: ServerEnv,
  kind: BodyTokenCookieKind,
  expiresAt: Date
) {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000)
  )

  return {
    ...createCookieBase(env, kind),
    expires: expiresAt,
    maxAge,
  }
}

function createCookieDeletionPolicy(env: ServerEnv, kind: BodyTokenCookieKind) {
  return {
    ...createCookieBase(env, kind),
    expires: new Date(0),
    maxAge: 0,
  }
}
