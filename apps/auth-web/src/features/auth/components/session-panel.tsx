"use client"

import { LogOut, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/primitives/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card"

import type { AuthSessionStatusResponse } from "@/src/lib/api/types"
import { APP_ROUTES } from "@/src/lib/routes"

type SessionPanelProps = {
  session: AuthSessionStatusResponse
}

export function SessionPanel({ session }: SessionPanelProps) {
  const router = useRouter()
  const t = useTranslations("auth.session")

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("brandName")}</p>
          <h1 className="text-2xl font-semibold tracking-normal">{t("title")}</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.refresh()} size="icon" variant="outline">
            <RefreshCw aria-hidden="true" />
            <span className="sr-only">{t("refresh")}</span>
          </Button>
          <Button asChild variant="outline">
            <a href={APP_ROUTES.logout}>
              <LogOut aria-hidden="true" />
              {t("logout")}
            </a>
          </Button>
        </div>
      </header>

      <Card className="rounded-md border border-border bg-transparent py-0 ring-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="text-lg font-semibold">{t("activeAccount")}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem label={t("email")} value={session.email} />
            <InfoItem label={t("userId")} value={session.userId} />
            <InfoItem label={t("sessionId")} value={session.sessionId} />
            <InfoItem label={t("status")} value={session.accountStatus} />
            <InfoItem label={t("roles")} value={session.roles.length ? session.roles.join(", ") : t("noRoles")} />
          </dl>
        </CardContent>
      </Card>
    </main>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}

