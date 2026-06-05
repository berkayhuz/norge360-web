import { CompactAuthShell } from "@/src/features/auth/components/compact-auth-shell"
import { LogoutPanel } from "@/src/features/auth/components/logout-panel"
import { getRequestI18n } from "@/src/lib/i18n/request"

export default async function LogoutPage() {
  const { messages } = await getRequestI18n()
  const auth = messages.auth

  return (
    <CompactAuthShell
      description={auth.logout.subtitle}
      footerDescription={auth.compactShell.footerLegal}
      localeLabel={auth.authShell.localeLabel}
      logoAlt={auth.compactShell.logoAlt}
      title={auth.logout.title}
      themeDarkLabel={auth.compactShell.themeDark}
      themeLightLabel={auth.compactShell.themeLight}
    >
      <LogoutPanel />
    </CompactAuthShell>
  )
}
