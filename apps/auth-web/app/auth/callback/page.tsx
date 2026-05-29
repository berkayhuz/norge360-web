import { redirect } from "next/navigation"

import { tryGetServerEnv } from "@/src/lib/env/server"
import {
  APP_ROUTES,
  buildLoginUrl,
  resolveSafeRedirect,
} from "@/src/lib/routes"
import { getCurrentSession } from "@/src/lib/api/server-auth"

type CallbackPageProps = {
  searchParams: Promise<{
    returnUrl?: string
  }>
}

export default async function CallbackPage({
  searchParams,
}: CallbackPageProps) {
  const params = await searchParams
  const session = await getCurrentSession()

  if (!session) {
    redirect(buildLoginUrl(params.returnUrl))
  }

  const { env } = tryGetServerEnv()
  const redirectOptions = {
    allowedOrigins: env?.allowedRedirectOrigins ?? [],
    appOrigin: env ? new URL(env.authWebAppUrl).origin : undefined,
  }
  const fallbackRedirect = resolveSafeRedirect(
    env?.postLoginRedirectUrl,
    APP_ROUTES.session,
    redirectOptions
  )

  redirect(
    resolveSafeRedirect(params.returnUrl, fallbackRedirect, redirectOptions)
  )
}
