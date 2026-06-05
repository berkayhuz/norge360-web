import { NextResponse, type NextRequest } from "next/server"

import { buildCallbackUrl, buildLoginUrl, isAuthPagePath, isProtectedPath } from "@/src/lib/routes"

const ACCESS_COOKIE_NAME =
  process.env.AUTH_ACCESS_COOKIE_NAME ?? "Norge360-access"
const SESSION_COOKIE_NAME =
  process.env.AUTH_SESSION_COOKIE_NAME ?? "Norge360-session"
const PUBLIC_WEB_HOME_URL =
  process.env.POST_LOGIN_REDIRECT_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://norge360.com/"
    : "http://localhost:3000/")

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSessionCookie =
    request.cookies.has(ACCESS_COOKIE_NAME) ||
    request.cookies.has(SESSION_COOKIE_NAME)

  if (isProtectedPath(pathname) && !hasSessionCookie) {
    const loginUrl = new URL(buildLoginUrl(`${pathname}${search}`), request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPagePath(pathname) && hasSessionCookie) {
    const callbackUrl = new URL(buildCallbackUrl(PUBLIC_WEB_HOME_URL), request.url)
    return NextResponse.redirect(callbackUrl)
  }

  return NextResponse.next()
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
