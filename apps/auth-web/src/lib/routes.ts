export const APP_ROUTES = {
  callback: "/auth/callback",
  confirmEmail: "/confirm-email",
  confirmEmailChange: "/confirm-email-change",
  forgotPassword: "/forgot-password",
  login: "/login",
  logout: "/logout",
  register: "/register",
  resendConfirmEmail: "/resend-confirm-email",
  resetPassword: "/reset-password",
} as const

export const AUTH_API_PATHS = {
  confirmEmail: "/confirm-email",
  confirmEmailChange: "/confirm-email-change",
  forgotPassword: "/forgot-password",
  login: "/login",
  logout: "/logout",
  register: "/register",
  resendConfirmEmail: "/resend-confirm-email",
  resetPassword: "/reset-password",
  sessionStatus: "/session-status",
} as const

export const AUTH_FLOW_SOURCES = {
  login: "login",
  register: "register",
} as const

export type AuthFlowSource =
  (typeof AUTH_FLOW_SOURCES)[keyof typeof AUTH_FLOW_SOURCES]

const AUTH_PAGE_PATHS = new Set<string>([
  APP_ROUTES.callback,
  APP_ROUTES.confirmEmail,
  APP_ROUTES.confirmEmailChange,
  APP_ROUTES.forgotPassword,
  APP_ROUTES.login,
  APP_ROUTES.register,
  APP_ROUTES.resendConfirmEmail,
  APP_ROUTES.resetPassword,
])

export function buildCallbackUrl(
  returnUrl: string | null | undefined,
  source?: AuthFlowSource
) {
  const params = new URLSearchParams()
  if (returnUrl) {
    params.set("returnUrl", returnUrl)
  }
  if (source) {
    params.set("source", source)
  }

  const query = params.toString()
  return query ? `${APP_ROUTES.callback}?${query}` : APP_ROUTES.callback
}

export function buildLoginUrl(returnUrl: string | null | undefined) {
  const params = new URLSearchParams()
  if (returnUrl) {
    params.set("returnUrl", returnUrl)
  }

  const query = params.toString()
  return query ? `${APP_ROUTES.login}?${query}` : APP_ROUTES.login
}

export function isAuthPagePath(pathname: string) {
  return AUTH_PAGE_PATHS.has(pathname)
}

export function isProtectedPath(pathname: string) {
  return false
}

export function resolveSafeRedirect(
  candidate: string | null | undefined,
  fallback: string,
  options?: {
    appOrigin?: string
    allowedOrigins?: readonly string[]
  }
) {
  if (!candidate) {
    return fallback
  }

  const trimmed = candidate.trim()
  if (!trimmed) {
    return fallback
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.startsWith("/api/") || trimmed === "/api") {
      return fallback
    }

    return isAuthPagePath(trimmed.split("?")[0] ?? trimmed) ? fallback : trimmed
  }

  const appOrigin = options?.appOrigin
  const allowedOrigins = new Set(
    [appOrigin, ...(options?.allowedOrigins ?? [])]
      .filter((origin): origin is string => Boolean(origin))
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin))
  )

  try {
    const parsed = new URL(trimmed)
    const origin = normalizeOrigin(parsed.origin)

    if (!origin || !allowedOrigins.has(origin)) {
      return fallback
    }

    return parsed.toString()
  } catch {
    return fallback
  }
}

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin
  } catch {
    return null
  }
}
