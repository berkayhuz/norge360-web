import { redirect } from "next/navigation"

import { tryGetServerEnv } from "@/src/lib/env/server"
import {
  AUTH_FLOW_SOURCES,
  buildLoginUrl,
  resolveSafeRedirect,
} from "@/src/lib/routes"
import { getCurrentSession, getMyProfileUsername } from "@/src/lib/api/server-auth"

type CallbackPageProps = {
  searchParams: Promise<{
    source?: string
    returnUrl?: string
  }>
}

export default async function CallbackPage({
  searchParams,
}: CallbackPageProps) {
  const params = await searchParams
  const session = await getCurrentSession()

  if (!session) {
    redirect(buildLoginUrl(undefined))
  }

  const { env } = tryGetServerEnv()
  const redirectOptions = {
    allowedOrigins: env?.allowedRedirectOrigins ?? [],
    appOrigin: env ? new URL(env.authWebAppUrl).origin : undefined,
  }
  const fallbackRedirect = resolveSafeRedirect(
    env?.postLoginRedirectUrl,
    process.env.NODE_ENV === "production"
      ? "https://norge360.com/"
      : "http://localhost:3000/",
    redirectOptions
  )

  if (params.source === AUTH_FLOW_SOURCES.register) {
    const profile = await getMyProfileUsername({ attempts: 10, delayMs: 1_000 })
    if (profile.kind === "success") {
      redirect(buildPublicProfileUrl(fallbackRedirect, profile.username))
    }
  }

  redirect(resolveSafeRedirect(params.returnUrl, fallbackRedirect, redirectOptions))
}

function buildPublicProfileUrl(baseUrlOrPath: string, username: string) {
  const safeUsername = encodeURIComponent(username.trim())

  if (baseUrlOrPath.startsWith("/") && !baseUrlOrPath.startsWith("//")) {
    return `/${safeUsername}`
  }

  try {
    const baseUrl = new URL(baseUrlOrPath)
    baseUrl.pathname = `/${safeUsername}`
    baseUrl.search = ""
    baseUrl.hash = ""
    return baseUrl.toString()
  } catch {
    return `/${safeUsername}`
  }
}
