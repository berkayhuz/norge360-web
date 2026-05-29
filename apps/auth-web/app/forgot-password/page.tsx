import Link from "next/link"
import { AuthShell } from "@/src/features/auth/components/auth-shell"
import { ForgotPasswordForm } from "@/src/features/auth/components/forgot-password-form"
import { APP_ROUTES } from "@/src/lib/routes"

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Sifre sifirlama"
      footer={<Link className="font-medium text-primary hover:underline" href={APP_ROUTES.login}>Giris sayfasina don</Link>}
      subtitle="E-posta adresinizi girin; hesap bulunursa yonergeler gonderilir."
      title="Sifrenizi sifirlayin"
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
