import { CompactAuthShell } from "@/src/features/auth/components/compact-auth-shell"
import { ConfirmEmailChangePanel } from "@/src/features/auth/components/confirm-email-change-panel"
import { getRequestI18n } from "@/src/lib/i18n/request"
import { APP_ROUTES } from "@/src/lib/routes"

type ConfirmEmailChangePageProps = {
  searchParams: Promise<{
    newEmail?: string
    token?: string
    userId?: string
  }>
}

export default async function ConfirmEmailChangePage({ searchParams }: ConfirmEmailChangePageProps) {
  const params = await searchParams
  const { messages } = await getRequestI18n()
  const auth = messages.auth

  return (
    <CompactAuthShell
      description={auth.confirmEmailChange.subtitle}
      footerDescription={auth.compactShell.footerLegal}
      localeLabel={auth.authShell.localeLabel}
      logoAlt={auth.compactShell.logoAlt}
      primaryActionHref={APP_ROUTES.login}
      primaryActionLabel={auth.confirmEmailChangePanel.backToLogin}
      title={auth.confirmEmailChange.title}
      themeDarkLabel={auth.compactShell.themeDark}
      themeLightLabel={auth.compactShell.themeLight}
    >
      <ConfirmEmailChangePanel newEmail={params.newEmail} token={params.token} userId={params.userId} />
    </CompactAuthShell>
  )
}
