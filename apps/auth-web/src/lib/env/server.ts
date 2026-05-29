import { z } from "zod"

const DEFAULT_AUTH_API_BASE_URL = "http://localhost:5030"
const DEFAULT_AUTH_WEB_APP_URL = "http://localhost:3000"
const DEFAULT_POST_LOGIN_REDIRECT_URL = "/session"

const envSchema = z.object({
  allowedRedirectOrigins: z.array(z.string().url()).default([]),
  authApiBaseUrl: z.string().url(),
  authCookieDomain: z.string().trim().min(1).optional(),
  authWebAppUrl: z.string().url(),
  cookieNames: z.object({
    access: z.string().min(1),
    refresh: z.string().min(1),
    session: z.string().min(1),
  }),
  isProduction: z.boolean(),
  postLoginRedirectUrl: z.string().min(1),
})

export type ServerEnv = z.infer<typeof envSchema>

export function getServerEnv(): ServerEnv {
  const isProduction = process.env.NODE_ENV === "production"
  const rawAllowedOrigins = splitCsv(process.env.ALLOWED_REDIRECT_ORIGINS)

  return envSchema.parse({
    allowedRedirectOrigins: rawAllowedOrigins,
    authApiBaseUrl:
      process.env.AUTH_API_BASE_URL ??
      (isProduction ? undefined : DEFAULT_AUTH_API_BASE_URL),
    authCookieDomain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    authWebAppUrl:
      process.env.AUTH_WEB_APP_URL ??
      (isProduction ? undefined : DEFAULT_AUTH_WEB_APP_URL),
    cookieNames: {
      access: process.env.AUTH_ACCESS_COOKIE_NAME ?? "Norge360-access",
      refresh: process.env.AUTH_REFRESH_COOKIE_NAME ?? "Norge360-refresh",
      session: process.env.AUTH_SESSION_COOKIE_NAME ?? "Norge360-session",
    },
    isProduction,
    postLoginRedirectUrl:
      process.env.POST_LOGIN_REDIRECT_URL ?? DEFAULT_POST_LOGIN_REDIRECT_URL,
  })
}

export function tryGetServerEnv() {
  const result = envSchema.safeParse({
    allowedRedirectOrigins: splitCsv(process.env.ALLOWED_REDIRECT_ORIGINS),
    authApiBaseUrl:
      process.env.AUTH_API_BASE_URL ??
      (process.env.NODE_ENV === "production"
        ? undefined
        : DEFAULT_AUTH_API_BASE_URL),
    authCookieDomain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    authWebAppUrl:
      process.env.AUTH_WEB_APP_URL ??
      (process.env.NODE_ENV === "production"
        ? undefined
        : DEFAULT_AUTH_WEB_APP_URL),
    cookieNames: {
      access: process.env.AUTH_ACCESS_COOKIE_NAME ?? "Norge360-access",
      refresh: process.env.AUTH_REFRESH_COOKIE_NAME ?? "Norge360-refresh",
      session: process.env.AUTH_SESSION_COOKIE_NAME ?? "Norge360-session",
    },
    isProduction: process.env.NODE_ENV === "production",
    postLoginRedirectUrl:
      process.env.POST_LOGIN_REDIRECT_URL ?? DEFAULT_POST_LOGIN_REDIRECT_URL,
  })

  if (result.success) {
    return { env: result.data, error: null } as const
  }

  return { env: null, error: result.error } as const
}

function splitCsv(value: string | undefined) {
  if (!value) {
    return []
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
