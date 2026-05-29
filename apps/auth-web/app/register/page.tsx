import { RegisterForm } from "@/src/features/auth/components/register-form"
import { getRequestI18n } from "@/src/lib/i18n/request"
import { APP_ROUTES } from "@/src/lib/routes"
import { CompactAuthShell } from "@/src/features/auth/components/compact-auth-shell"

type RegisterPageProps = { searchParams: Promise<{ returnUrl?: string }> }

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const { locale, messages } = await getRequestI18n()
  const auth = messages.auth

  return (
    <CompactAuthShell
      description={auth.register.subtitle}
      footerDescription={auth.compactShell.footerLegal}
      localeLabel={auth.authShell.localeLabel}
      logoAlt={auth.compactShell.logoAlt}
      primaryActionHref={APP_ROUTES.login}
      primaryActionLabel={auth.register.signIn}
      secondaryActionText={auth.register.hasAccount}
      title={auth.register.title}
      themeDarkLabel={auth.compactShell.themeDark}
      themeLightLabel={auth.compactShell.themeLight}
    >
      <RegisterForm locale={locale} returnUrl={params.returnUrl} />
    </CompactAuthShell>
  )
}
