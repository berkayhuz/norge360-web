"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { Card, CardContent } from "@workspace/ui/components/layout/card"

import { APP_ROUTES } from "@/src/lib/routes"
import { LocaleSelect } from "./locale-select"

type AuthShellProps = {
  children: React.ReactNode
  eyebrow?: string
  footer?: React.ReactNode
  subtitle: string
  title: string
}

export function AuthShell({ children, eyebrow, footer, subtitle, title }: AuthShellProps) {
  const t = useTranslations("auth.authShell")

  return (
    <main className="min-h-svh bg-background">
      <div className="grid min-h-svh lg:grid-cols-[minmax(320px,0.92fr)_1.08fr]">
        <section className="hidden border-e border-border bg-muted/35 px-10 py-8 lg:flex lg:flex-col">
          <Link className="inline-flex w-fit items-center gap-2 font-medium text-foreground" href={APP_ROUTES.login}>
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">N</span>
            {t("brandName")}
          </Link>

          <div className="flex flex-1 flex-col justify-center gap-8">
            <div className="max-w-md">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{t("brandName")}</p>
                <LocaleSelect label={t("localeLabel")} />
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">{t("heroTitle")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("heroBody")}</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-md border border-border bg-background p-4">{t("valueAccess")}</div>
              <div className="rounded-md border border-border bg-background p-4">{t("valueExperience")}</div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[440px]">
            <Link className="mb-8 inline-flex items-center gap-2 font-medium text-foreground lg:hidden" href={APP_ROUTES.login}>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">N</span>
              {t("brandName")}
            </Link>
            <div className="mb-4 lg:hidden">
              <LocaleSelect label={t("localeLabel")} />
            </div>

            <Card className="rounded-md border border-border bg-transparent py-0 shadow-sm ring-0">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-6">
                  {eyebrow ? <p className="mb-2 text-sm font-medium text-primary">{eyebrow}</p> : null}
                  <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
                </div>

                {children}
              </CardContent>
            </Card>

            {footer ? <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  )
}
