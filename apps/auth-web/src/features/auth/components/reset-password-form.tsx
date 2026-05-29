"use client"

import Link from "next/link"
import * as React from "react"
import { ApiProblemError } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import { APP_ROUTES, AUTH_API_PATHS } from "@/src/lib/routes"
import { FieldMessage, PasswordField, SubmitButton } from "./form-fields"
import { getFormString, zodFieldErrors } from "./form-utils"
import { resetPasswordSchema } from "../schemas/auth-schemas"
import type { ValidationErrors } from "@/src/lib/api/types"

type ResetPasswordFormProps = {
  token?: string
  userId?: string
}

export function ResetPasswordForm({ token = "", userId = "" }: ResetPasswordFormProps) {
  const [fieldErrors, setFieldErrors] = React.useState<ValidationErrors>({})
  const [message, setMessage] = React.useState<{ text: string; tone: "danger" | "success" } | null>(null)
  const [pending, startTransition] = React.useTransition()

  const hasRequiredQuery = Boolean(token && userId)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = resetPasswordSchema.safeParse({
      confirmPassword: getFormString(new FormData(event.currentTarget), "confirmPassword"),
      newPassword: getFormString(new FormData(event.currentTarget), "newPassword"),
      token: getFormString(new FormData(event.currentTarget), "token"),
      userId: getFormString(new FormData(event.currentTarget), "userId"),
    })
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }
    startTransition(async () => {
      try {
        await authRequest(AUTH_API_PATHS.resetPassword, {
          body: { newPassword: parsed.data.newPassword, token: parsed.data.token, userId: parsed.data.userId },
          method: "POST",
        })
        setMessage({ text: "Sifreniz guncellendi. Yeni sifrenizle giris yapabilirsiniz.", tone: "success" })
      } catch (error) {
        setMessage({ text: error instanceof ApiProblemError ? error.userMessage : "Sifre guncellenemedi.", tone: "danger" })
      }
    })
  }

  if (!hasRequiredQuery) {
    return (
      <div className="grid gap-4">
        <FieldMessage tone="danger">Sifre sifirlama baglantisi eksik veya gecersiz.</FieldMessage>
        <Link className="text-sm font-medium text-primary" href={APP_ROUTES.login}>Giris sayfasina don</Link>
      </div>
    )
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      {message ? <FieldMessage tone={message.tone}>{message.text}</FieldMessage> : null}
      <input name="userId" type="hidden" value={userId} />
      <input name="token" type="hidden" value={token} />
      <PasswordField autoComplete="new-password" disabled={pending} fieldErrors={fieldErrors} label="Yeni sifre" maxLength={128} minLength={12} name="newPassword" required />
      <PasswordField autoComplete="new-password" disabled={pending} fieldErrors={fieldErrors} label="Yeni sifre tekrar" maxLength={128} minLength={12} name="confirmPassword" required />
      <SubmitButton disabled={pending}>{pending ? "Guncelleniyor..." : "Sifreyi guncelle"}</SubmitButton>
    </form>
  )
}
