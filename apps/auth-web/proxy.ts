import { NextResponse, type NextRequest } from "next/server"

import {
  APP_ROUTES,
  buildCallbackUrl,
  buildLoginUrl,
  isAuthPagePath,
  isProtectedPath,
} from "@/src/lib/routes"

const ACCESS_COOKIE_NAME =
  process.env.AUTH_ACCESS_COOKIE_NAME ?? "Norge360-access"
const SESSION_COOKIE_NAME =
  process.env.AUTH_SESSION_COOKIE_NAME ?? "Norge360-session"

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
    const returnUrl = request.nextUrl.searchParams.get("returnUrl")
    const callbackUrl = new URL(
      buildCallbackUrl(returnUrl ?? APP_ROUTES.session),
      request.url
    )
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
    "/invite/accept",
    "/session",
  ],
}
