import Link from "next/link"
import { AuthShell } from "@/src/features/auth/components/auth-shell"
import { ResendConfirmEmailForm } from "@/src/features/auth/components/resend-confirm-email-form"
import { APP_ROUTES } from "@/src/lib/routes"

export default function ResendConfirmEmailPage() {
  return (
    <AuthShell
      eyebrow="E-posta dogrulama"
      footer={<Link className="font-medium text-primary hover:underline" href={APP_ROUTES.login}>Giris sayfasina don</Link>}
      subtitle="Dogrulama e-postasini yeniden isteyin."
      title="Dogrulama e-postasi gonder"
    >
      <ResendConfirmEmailForm />
    </AuthShell>
  )
}
