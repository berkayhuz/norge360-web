import { AuthShell } from "@/src/features/auth/components/auth-shell"
import { LogoutPanel } from "@/src/features/auth/components/logout-panel"

export default function LogoutPage() {
  return (
    <AuthShell
      eyebrow="Çıkış"
      subtitle="Oturumunuz güvenli şekilde kapatılıyor."
      title="Güvenli çıkış"
    >
      <LogoutPanel />
    </AuthShell>
  )
}
