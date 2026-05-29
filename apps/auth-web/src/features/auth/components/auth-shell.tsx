import Link from "next/link"
import { Card, CardContent } from "@workspace/ui/components/card"

import { APP_ROUTES } from "@/src/lib/routes"
import { LocaleSelect } from "./locale-select"

type AuthShellCopy = {
  brandName: string
  heroBody: string
  heroTitle: string
  localeLabel: string
  valueAccess: string
  valueExperience: string
}

type AuthShellProps = {
  children: React.ReactNode
  copy?: AuthShellCopy
  eyebrow?: string
  footer?: React.ReactNode
  subtitle: string
  title: string
}

const DEFAULT_COPY: AuthShellCopy = {
  brandName: "Norge360",
  heroBody: "A calm and reliable entry point for your account, security, and workspace access.",
  heroTitle: "Secure access for every team",
  localeLabel: "Language",
  valueAccess: "Platform access, profile, and security settings are managed through your Norge360 identity.",
  valueExperience: "The sign-in experience stays fast and clear across desktop and mobile."
}

export function AuthShell({ children, copy = DEFAULT_COPY, eyebrow, footer, subtitle, title }: AuthShellProps) {
  return (
    <main className="min-h-svh bg-background">
      <div className="grid min-h-svh lg:grid-cols-[minmax(320px,0.92fr)_1.08fr]">
        <section className="hidden border-e border-border bg-muted/35 px-10 py-8 lg:flex lg:flex-col">
          <Link className="inline-flex w-fit items-center gap-2 font-medium text-foreground" href={APP_ROUTES.login}>
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">N</span>
            {copy.brandName}
          </Link>

          <div className="flex flex-1 flex-col justify-center gap-8">
            <div className="max-w-md">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{copy.brandName}</p>
                <LocaleSelect label={copy.localeLabel} />
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">{copy.heroTitle}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{copy.heroBody}</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-md border border-border bg-background p-4">{copy.valueAccess}</div>
              <div className="rounded-md border border-border bg-background p-4">{copy.valueExperience}</div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[440px]">
            <Link className="mb-8 inline-flex items-center gap-2 font-medium text-foreground lg:hidden" href={APP_ROUTES.login}>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">N</span>
              {copy.brandName}
            </Link>
            <div className="mb-4 lg:hidden">
              <LocaleSelect label={copy.localeLabel} />
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
