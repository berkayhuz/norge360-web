import Link from "next/link"

import { APP_ROUTES } from "@/src/lib/routes"

type AuthShellProps = {
  children: React.ReactNode
  eyebrow?: string
  footer?: React.ReactNode
  subtitle: string
  title: string
}

export function AuthShell({
  children,
  eyebrow,
  footer,
  subtitle,
  title,
}: AuthShellProps) {
  return (
    <main className="min-h-svh bg-background">
      <div className="grid min-h-svh lg:grid-cols-[minmax(320px,0.92fr)_1.08fr]">
        <section className="hidden border-e border-border bg-muted/35 px-10 py-8 lg:flex lg:flex-col">
          <Link
            className="inline-flex w-fit items-center gap-2 font-medium text-foreground"
            href={APP_ROUTES.login}
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              N
            </span>
            Norge360
          </Link>

          <div className="flex flex-1 flex-col justify-center gap-8">
            <div className="max-w-md">
              <p className="text-sm text-muted-foreground">Norge360</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                Topluluk hesabınıza sakin, güven veren bir giriş kapısı.
              </h2>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-md border border-border bg-background p-4">
                Platform erişimi, profiliniz ve güvenlik ayarlarınız tek
                Norge360 kimliğiyle yönetilir.
              </div>
              <div className="rounded-md border border-border bg-background p-4">
                Oturum deneyimi hızlı, anlaşılır ve mobile kadar düzenli kalır.
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[440px]">
            <Link
              className="mb-8 inline-flex items-center gap-2 font-medium text-foreground lg:hidden"
              href={APP_ROUTES.login}
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                N
              </span>
              Norge360
            </Link>

            <div className="rounded-md border border-border p-5 shadow-sm sm:p-6">
              <div className="mb-6">
                {eyebrow ? (
                  <p className="mb-2 text-sm font-medium text-primary">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="text-2xl font-semibold tracking-normal">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
              </div>

              {children}
            </div>

            {footer ? (
              <div className="mt-5 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
