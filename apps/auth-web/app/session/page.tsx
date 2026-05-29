import { redirect } from "next/navigation"

import { SessionPanel } from "@/src/features/auth/components/session-panel"
import { getCurrentSession } from "@/src/lib/api/server-auth"
import { buildLoginUrl, APP_ROUTES } from "@/src/lib/routes"

export default async function SessionPage() {
  const session = await getCurrentSession()

  if (!session) {
    redirect(buildLoginUrl(APP_ROUTES.session))
  }

  return <SessionPanel session={session} />
}
