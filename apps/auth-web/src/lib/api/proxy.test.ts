import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { proxyAuthRequest } from "./proxy"

vi.mock("@/src/lib/env/server", () => ({
  tryGetServerEnv: vi.fn(),
}))

const { tryGetServerEnv } = await import("@/src/lib/env/server")

const baseEnv = {
  allowedRedirectOrigins: ["http://localhost:3000"],
  authApiBaseUrl: "http://localhost:5030",
  authCookieDomain: ".norge360.com",
  authWebAppUrl: "https://auth.norge360.com",
  cookieNames: {
    access: "Norge360-access",
    refresh: "Norge360-refresh",
    session: "Norge360-session",
  },
  isProduction: true,
  postLoginRedirectUrl: "https://norge360.com/",
}

describe("proxyAuthRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("strips body tokens from proxied JSON response", async () => {
    vi.mocked(tryGetServerEnv).mockReturnValue({ env: baseEnv, error: null })
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "access-secret",
          accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
          email: "user@norge360.com",
          refreshToken: "refresh-secret",
          refreshTokenExpiresAt: "2099-01-02T00:00:00.000Z",
          sessionId: "11111111-1111-1111-1111-111111111111",
          userId: "11111111-1111-1111-1111-111111111111",
          userName: "user",
        }),
        { headers: { "content-type": "application/json" }, status: 200 }
      )
    )

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      body: JSON.stringify({ emailOrUserName: "user", password: "secret" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })

    const response = await proxyAuthRequest(request, { path: ["login"] })
    const body = (await response.json()) as Record<string, unknown>

    expect(body.accessToken).toBeUndefined()
    expect(body.refreshToken).toBeUndefined()
    expect(body.sessionId).toBe("11111111-1111-1111-1111-111111111111")
  })

  it("sets fallback cookies with secure flags and matching domain/path", async () => {
    vi.mocked(tryGetServerEnv).mockReturnValue({ env: baseEnv, error: null })
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "access-secret",
          accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
          refreshToken: "refresh-secret",
          refreshTokenExpiresAt: "2099-01-02T00:00:00.000Z",
          sessionId: "11111111-1111-1111-1111-111111111111",
        }),
        { headers: { "content-type": "application/json" }, status: 200 }
      )
    )

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      body: JSON.stringify({ emailOrUserName: "user", password: "secret" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    const response = await proxyAuthRequest(request, { path: ["login"] })
    const cookies = getSetCookies(response)

    expect(
      cookies.some((value) =>
        hasCookieAttributes(value, "Norge360-access", "/", ".norge360.com")
      )
    ).toBe(true)
    expect(
      cookies.some((value) =>
        hasCookieAttributes(
          value,
          "Norge360-refresh",
          "/api/auth",
          ".norge360.com"
        )
      )
    ).toBe(true)
    expect(
      cookies.some((value) =>
        hasCookieAttributes(
          value,
          "Norge360-session",
          "/api/auth",
          ".norge360.com"
        )
      )
    ).toBe(true)
  })

  it("clears cookies on logout with matching path/domain and max-age=0", async () => {
    vi.mocked(tryGetServerEnv).mockReturnValue({ env: baseEnv, error: null })
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 })
    )

    const request = new NextRequest("http://localhost:3000/api/auth/logout", {
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    const response = await proxyAuthRequest(request, { path: ["logout"] })
    const cookies = getSetCookies(response)

    expect(
      cookies.some(
        (value) =>
          hasCookieAttributes(value, "Norge360-access", "/", ".norge360.com") &&
          value.toLowerCase().includes("max-age=0")
      )
    ).toBe(true)
    expect(
      cookies.some(
        (value) =>
          hasCookieAttributes(
            value,
            "Norge360-refresh",
            "/api/auth",
            ".norge360.com"
          ) && value.toLowerCase().includes("max-age=0")
      )
    ).toBe(true)
    expect(
      cookies.some(
        (value) =>
          hasCookieAttributes(
            value,
            "Norge360-session",
            "/api/auth",
            ".norge360.com"
          ) && value.toLowerCase().includes("max-age=0")
      )
    ).toBe(true)
  })

  it("rejects proxy routes outside documented allowlist", async () => {
    vi.mocked(tryGetServerEnv).mockReturnValue({ env: baseEnv, error: null })
    const fetchMock = vi.spyOn(globalThis, "fetch")

    const request = new NextRequest("http://localhost:3000/api/auth/unknown", {
      method: "GET",
    })
    const response = await proxyAuthRequest(request, { path: ["unknown"] })
    const body = (await response.json()) as {
      errorCode: string
      status: number
    }

    expect(response.status).toBe(404)
    expect(body.errorCode).toBe("auth_proxy_route_not_allowed")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

function getSetCookies(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[]
  }
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }

  const raw = response.headers.get("set-cookie")
  return raw ? [raw] : []
}

function hasCookieAttributes(
  cookieHeader: string,
  cookieName: string,
  path: string,
  domain: string
) {
  const lower = cookieHeader.toLowerCase()
  return (
    lower.startsWith(`${cookieName.toLowerCase()}=`) &&
    lower.includes(`path=${path.toLowerCase()}`) &&
    lower.includes(`domain=${domain.toLowerCase()}`) &&
    lower.includes("httponly") &&
    lower.includes("secure") &&
    lower.includes("samesite=lax")
  )
}
