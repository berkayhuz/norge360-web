import { CompactAuthShell } from "@/src/features/auth/components/compact-auth-shell"
import { ForgotPasswordForm } from "@/src/features/auth/components/forgot-password-form"
import { getRequestI18n } from "@/src/lib/i18n/request"
import { APP_ROUTES } from "@/src/lib/routes"

export default async function ForgotPasswordPage() {
  const { messages } = await getRequestI18n()
  const auth = messages.auth

  return (
    <CompactAuthShell
      description={auth.forgotPassword.subtitle}
      footerDescription={auth.compactShell.footerLegal}
      localeLabel={auth.authShell.localeLabel}
      logoAlt={auth.compactShell.logoAlt}
      primaryActionHref={APP_ROUTES.login}
      primaryActionLabel={auth.forgotPassword.backToLogin}
      themeDarkLabel={auth.compactShell.themeDark}
      themeLightLabel={auth.compactShell.themeLight}
      title={auth.forgotPassword.title}
    >
      <ForgotPasswordForm />
    </CompactAuthShell>
  )
}
