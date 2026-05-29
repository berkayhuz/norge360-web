import Link from "next/link"
import { AuthShell } from "@/src/features/auth/components/auth-shell"
import { RegisterForm } from "@/src/features/auth/components/register-form"
import { APP_ROUTES } from "@/src/lib/routes"

type RegisterPageProps = { searchParams: Promise<{ returnUrl?: string }> }

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  return (
    <AuthShell
      eyebrow="Yeni hesap"
      footer={
        <>
          Zaten hesabiniz var mi?{" "}
          <Link className="font-medium text-primary hover:underline" href={APP_ROUTES.login}>
            Giris yapin
          </Link>
        </>
      }
      subtitle="Norge360 icin kullanici hesabinizi olusturun."
      title="Norge360 hesabi olusturun"
    >
      <RegisterForm returnUrl={params.returnUrl} />
    </AuthShell>
  )
}
