import { AuthShell } from "@/src/features/auth/components/auth-shell"
import { ConfirmEmailPanel } from "@/src/features/auth/components/confirm-email-panel"

type ConfirmEmailPageProps = {
  searchParams: Promise<{
    token?: string
    userId?: string
  }>
}

export default async function ConfirmEmailPage({
  searchParams,
}: ConfirmEmailPageProps) {
  const params = await searchParams

  return (
    <AuthShell
      eyebrow="E-posta doğrulama"
      subtitle="Doğrulama bağlantınız kontrol ediliyor."
      title="E-postanızı doğrulayın"
    >
      <ConfirmEmailPanel
        token={params.token}
        userId={params.userId}
      />
    </AuthShell>
  )
}
