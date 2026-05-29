import { AuthShell } from "@/src/features/auth/components/auth-shell"
import { ResetPasswordForm } from "@/src/features/auth/components/reset-password-form"

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; userId?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  return (
    <AuthShell eyebrow="Yeni sifre" subtitle="E-postadaki baglanti ile sifrenizi guncelleyin." title="Sifreyi guncelle">
      <ResetPasswordForm token={params.token} userId={params.userId} />
    </AuthShell>
  )
}
