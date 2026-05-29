import { CompactAuthShell } from "@/src/features/auth/components/compact-auth-shell"
import { ResetPasswordForm } from "@/src/features/auth/components/reset-password-form"
import { getRequestI18n } from "@/src/lib/i18n/request"
import { APP_ROUTES } from "@/src/lib/routes"

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; userId?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  const { messages } = await getRequestI18n()
  const auth = messages.auth

  return (
    <CompactAuthShell
      description={auth.resetPassword.subtitle}
      footerDescription={auth.compactShell.footerLegal}
      localeLabel={auth.authShell.localeLabel}
      logoAlt={auth.compactShell.logoAlt}
      primaryActionHref={APP_ROUTES.login}
      primaryActionLabel={auth.resetPassword.form.backToLogin}
      title={auth.resetPassword.title}
      themeDarkLabel={auth.compactShell.themeDark}
      themeLightLabel={auth.compactShell.themeLight}
    >
      <ResetPasswordForm token={params.token} userId={params.userId} />
    </CompactAuthShell>
  )
}
