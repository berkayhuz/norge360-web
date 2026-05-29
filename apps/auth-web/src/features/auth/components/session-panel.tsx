"use client"

import { LogOut, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@norge360/ui/components/button"

import type { AuthSessionStatusResponse } from "@/src/lib/api/types"
import { APP_ROUTES } from "@/src/lib/routes"

type SessionPanelProps = {
  session: AuthSessionStatusResponse
}

export function SessionPanel({ session }: SessionPanelProps) {
  const router = useRouter()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Norge360</p>
          <h1 className="text-2xl font-semibold tracking-normal">Oturum</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.refresh()} size="icon" variant="outline">
            <RefreshCw aria-hidden="true" />
            <span className="sr-only">Yenile</span>
          </Button>
          <Button asChild variant="outline">
            <a href={APP_ROUTES.logout}>
              <LogOut aria-hidden="true" />
              Cikis
            </a>
          </Button>
        </div>
      </header>

      <section className="rounded-md border border-border p-5">
        <h2 className="text-lg font-semibold">Aktif hesap</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <InfoItem label="E-posta" value={session.email} />
          <InfoItem label="User ID" value={session.userId} />
          <InfoItem label="Session ID" value={session.sessionId} />
          <InfoItem label="Durum" value={session.accountStatus} />
          <InfoItem
            label="Roller"
            value={session.roles.length ? session.roles.join(", ") : "Yok"}
          />
        </dl>
      </section>
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
