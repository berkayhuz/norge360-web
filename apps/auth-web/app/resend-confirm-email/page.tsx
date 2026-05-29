import { CompactAuthShell } from "@/src/features/auth/components/compact-auth-shell"
import { ResendConfirmEmailForm } from "@/src/features/auth/components/resend-confirm-email-form"
import { getRequestI18n } from "@/src/lib/i18n/request"
import { APP_ROUTES } from "@/src/lib/routes"

export default async function ResendConfirmEmailPage() {
  const { messages } = await getRequestI18n()
  const auth = messages.auth

  return (
    <CompactAuthShell
      description={auth.resendConfirmEmail.subtitle}
      footerDescription={auth.compactShell.footerLegal}
      localeLabel={auth.authShell.localeLabel}
      logoAlt={auth.compactShell.logoAlt}
      primaryActionHref={APP_ROUTES.login}
      primaryActionLabel={auth.resendConfirmEmail.backToLogin}
      title={auth.resendConfirmEmail.title}
      themeDarkLabel={auth.compactShell.themeDark}
      themeLightLabel={auth.compactShell.themeLight}
    >
      <ResendConfirmEmailForm />
    </CompactAuthShell>
  )
}
