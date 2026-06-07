import { NextResponse, type NextRequest } from "next/server"

import { tryGetServerEnv } from "@/src/lib/env/server"
import { buildCallbackUrl, buildLoginUrl, isAuthPagePath, isProtectedPath } from "@/src/lib/routes"
const PUBLIC_WEB_HOME_URL =
  process.env.POST_LOGIN_REDIRECT_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://norge360.com/"
    : "http://localhost:3000/")

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isProtectedPath(pathname) && !(await hasValidSession(request))) {
    const loginUrl = new URL(buildLoginUrl(`${pathname}${search}`), request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPagePath(pathname) && (await hasValidSession(request))) {
    const callbackUrl = new URL(buildCallbackUrl(PUBLIC_WEB_HOME_URL), request.url)
    return NextResponse.redirect(callbackUrl)
  }

  return NextResponse.next()
}

async function hasValidSession(request: NextRequest) {
  const { env } = tryGetServerEnv()

  if (!env) {
    return false
  }

  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) {
    return false
  }

  try {
    const response = await fetch(new URL("/api/auth/session-status", env.authApiBaseUrl), {
      cache: "no-store",
      headers: {
        accept: "application/json",
        cookie: cookieHeader,
        origin: new URL(env.authWebAppUrl).origin,
        referer: env.authWebAppUrl,
        "x-correlation-id": crypto.randomUUID(),
      },
    })

    return response.ok
  } catch {
    return false
  }
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/confirm-email",
    "/confirm-email-change",
    "/resend-confirm-email",
    "/logout",
  ],
}
