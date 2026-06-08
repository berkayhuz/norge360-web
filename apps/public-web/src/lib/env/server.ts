import { z } from "zod";

const DEFAULT_GATEWAY_API_BASE_URL = "http://localhost:5030";
const DEFAULT_PUBLIC_WEB_APP_URL = "http://localhost:3000";

const envSchema = z.object({
  authCookieNames: z.object({
    access: z.string().min(1),
    refresh: z.string().min(1),
    session: z.string().min(1),
  }),
  internalApiBaseUrl: z.string().url(),
  gatewayApiBaseUrl: z.string().url(),
  isProduction: z.boolean(),
  publicWebAppUrl: z.string().url(),
  siteUrl: z.string().url(),
});

export type PublicWebServerEnv = z.infer<typeof envSchema>;

export function getServerEnv(): PublicWebServerEnv {
  const isProduction = process.env.NODE_ENV === "production";
  const publicWebAppUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.PUBLIC_WEB_APP_URL ??
    (isProduction ? undefined : DEFAULT_PUBLIC_WEB_APP_URL);
  const internalApiBaseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.GATEWAY_API_BASE_URL ??
    (isProduction ? undefined : DEFAULT_GATEWAY_API_BASE_URL);

  return envSchema.parse({
    authCookieNames: {
      access: process.env.AUTH_ACCESS_COOKIE_NAME ?? "Norge360-access",
      refresh: process.env.AUTH_REFRESH_COOKIE_NAME ?? "Norge360-refresh",
      session: process.env.AUTH_SESSION_COOKIE_NAME ?? "Norge360-session",
    },
    internalApiBaseUrl,
    gatewayApiBaseUrl: internalApiBaseUrl,
    isProduction,
    publicWebAppUrl,
    siteUrl: publicWebAppUrl,
  });
}

export function tryGetServerEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const publicWebAppUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.PUBLIC_WEB_APP_URL ??
    (isProduction ? undefined : DEFAULT_PUBLIC_WEB_APP_URL);
  const internalApiBaseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.GATEWAY_API_BASE_URL ??
    (isProduction ? undefined : DEFAULT_GATEWAY_API_BASE_URL);

  const result = envSchema.safeParse({
    authCookieNames: {
      access: process.env.AUTH_ACCESS_COOKIE_NAME ?? "Norge360-access",
      refresh: process.env.AUTH_REFRESH_COOKIE_NAME ?? "Norge360-refresh",
      session: process.env.AUTH_SESSION_COOKIE_NAME ?? "Norge360-session",
    },
    internalApiBaseUrl,
    gatewayApiBaseUrl: internalApiBaseUrl,
    isProduction,
    publicWebAppUrl,
    siteUrl: publicWebAppUrl,
  });

  if (result.success) {
    return { env: result.data, error: null } as const;
  }

  return { env: null, error: result.error } as const;
}
