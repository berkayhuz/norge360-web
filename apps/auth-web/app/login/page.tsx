import Link from "next/link"
import { AuthShell } from "@/src/features/auth/components/auth-shell"
import { LoginForm } from "@/src/features/auth/components/login-form"
import { APP_ROUTES } from "@/src/lib/routes"

type LoginPageProps = {
  searchParams: Promise<{ returnUrl?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  return (
    <AuthShell
      eyebrow="Oturum"
      footer={
        <>
          Hesabiniz yok mu?{" "}
          <Link className="font-medium text-primary hover:underline" href={APP_ROUTES.register}>
            Kayit olun
          </Link>
        </>
      }
      subtitle="Hesabiniza guvenli sekilde giris yapin."
      title="Norge360'a giris yapin"
    >
      <LoginForm returnUrl={params.returnUrl} />
    </AuthShell>
  )
}
