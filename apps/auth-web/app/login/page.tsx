import { LoginForm } from "@/src/features/auth/components/login-form"
import { getRequestI18n } from "@/src/lib/i18n/request"
import { APP_ROUTES } from "@/src/lib/routes"
import { CompactAuthShell } from "@/src/features/auth/components/compact-auth-shell"

type LoginPageProps = {
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await searchParams
  const { messages } = await getRequestI18n()
  const auth = messages.auth

  return (
    <CompactAuthShell
      description={auth.login.subtitle}
      footerDescription={auth.compactShell.footerLegal}
      localeLabel={auth.authShell.localeLabel}
      logoAlt={auth.compactShell.logoAlt}
      primaryActionHref={APP_ROUTES.register}
      primaryActionLabel={auth.login.createAccount}
      secondaryActionText={auth.login.noAccount}
      title={auth.login.title}
      themeDarkLabel={auth.compactShell.themeDark}
      themeLightLabel={auth.compactShell.themeLight}
    >
      <LoginForm />
    </CompactAuthShell>
  )
}
