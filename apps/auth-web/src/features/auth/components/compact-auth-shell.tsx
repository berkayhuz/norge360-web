import Link from "next/link"
import { FieldDescription } from "@workspace/ui/components/field"
import { LocaleSelect } from "./locale-select"
import { ThemeToggle } from "./theme-toggle"

type CompactAuthShellProps = {
  children: React.ReactNode
  description: string
  footerDescription: string
  localeLabel: string
  logoAlt: string
  primaryActionHref?: string
  primaryActionLabel?: string
  secondaryActionText?: string
  themeDarkLabel: string
  themeLightLabel: string
  footer?: React.ReactNode
  title: string
}

export function CompactAuthShell({
  children,
  footer,
  footerDescription,
  localeLabel,
  logoAlt,
  primaryActionHref,
  primaryActionLabel,
  secondaryActionText,
  themeDarkLabel,
  themeLightLabel,
  title
}: CompactAuthShellProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <a href="https://norge360.com/" className="flex flex-col items-center gap-2 font-medium">
            <div className="flex size-10 items-center justify-center rounded-md">
              <img className="shrink-0" src="https://cdn.norge360.com/brand/logo/primary/norge360_logo_square_blue_white-5.png" alt={logoAlt} />
            </div>
            <span className="sr-only">{logoAlt}</span>
          </a>
          <h1 className="text-xl font-bold">{title}</h1>
          <FieldDescription className="space-x-1">
            {secondaryActionText ? <span>{secondaryActionText}</span> : null}
            {primaryActionHref && primaryActionLabel ? (
              <Link href={primaryActionHref} className="hover:underline">
                {primaryActionLabel}
              </Link>
            ) : null}
          </FieldDescription>
        </div>
        {children}
        <FieldDescription className="px-2 text-center">
          {footerDescription}
        </FieldDescription>
        {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
      <section className="max-md:sticky md:fixed bg-background w-full bottom-0 left-0 right-0 border-t border-border">
        <div className="text-xs font-medium text-muted-foreground p-4">
          <footer className="flex flex-row gap-4 text-xs text-muted-foreground md:items-center md:justify-between">
            <div className="flex gap-2 flex-col md:flex-row md:items-center md:gap-4">
              <p>© {new Date().getFullYear()} Norge360. All rights reserved.</p>

              <nav aria-label="Footer links">
                <ul className="flex items-center gap-3">
                  <li>
                    <a href="/terms" className="transition-colors hover:text-foreground">
                      Terms
                    </a>
                  </li>
                  <li>
                    <a href="/privacy" className="transition-colors hover:text-foreground">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="/security" className="transition-colors hover:text-foreground">
                      Security
                    </a>
                  </li>
                </ul>
              </nav>
            </div>

            <ul className="flex items-center gap-1.5 md:gap-3 justify-center md:justify-start">
              <li>
                <LocaleSelect label={localeLabel} />
              </li>
              <li>
                <ThemeToggle darkLabel={themeDarkLabel} lightLabel={themeLightLabel} />
              </li>
            </ul>
          </footer>
        </div>
      </section>
    </main>
  )
}
