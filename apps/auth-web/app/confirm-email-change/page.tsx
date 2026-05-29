import { AuthShell } from "@/src/features/auth/components/auth-shell"
import { ConfirmEmailChangePanel } from "@/src/features/auth/components/confirm-email-change-panel"

type ConfirmEmailChangePageProps = {
  searchParams: Promise<{
    newEmail?: string
    token?: string
    userId?: string
  }>
}

export default async function ConfirmEmailChangePage({
  searchParams,
}: ConfirmEmailChangePageProps) {
  const params = await searchParams

  return (
    <AuthShell
      eyebrow="E-posta değişikliği"
      subtitle="Yeni e-posta adresi token ile doğrulanır ve mevcut oturum temizlenir."
      title="E-posta adresini doğrula"
    >
      <ConfirmEmailChangePanel
        newEmail={params.newEmail}
        token={params.token}
        userId={params.userId}
      />
    </AuthShell>
  )
}
