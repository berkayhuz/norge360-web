import { CompactAuthShell } from "@/src/features/auth/components/compact-auth-shell"
import { ConfirmEmailPanel } from "@/src/features/auth/components/confirm-email-panel"
import { getRequestI18n } from "@/src/lib/i18n/request"
import { APP_ROUTES } from "@/src/lib/routes"

type ConfirmEmailPageProps = {
  searchParams: Promise<{
    token?: string
    userId?: string
  }>
}

export default async function ConfirmEmailPage({ searchParams }: ConfirmEmailPageProps) {
  const params = await searchParams
  const { messages } = await getRequestI18n()
  const auth = messages.auth

  return (
    <CompactAuthShell
      description={auth.confirmEmail.subtitle}
      footerDescription={auth.compactShell.footerLegal}
      localeLabel={auth.authShell.localeLabel}
      logoAlt={auth.compactShell.logoAlt}
      primaryActionHref={APP_ROUTES.login}
      primaryActionLabel={auth.confirmEmailPanel.backToLogin}
      title={auth.confirmEmail.title}
      themeDarkLabel={auth.compactShell.themeDark}
      themeLightLabel={auth.compactShell.themeLight}
    >
      <ConfirmEmailPanel token={params.token} userId={params.userId} />
    </CompactAuthShell>
  )
}
