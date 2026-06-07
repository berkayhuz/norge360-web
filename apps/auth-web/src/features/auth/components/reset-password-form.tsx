"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import * as React from "react"

import { ApiProblemError, getProblemMessageKey } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import type { ValidationErrors } from "@/src/lib/api/types"
import { APP_ROUTES, AUTH_API_PATHS } from "@/src/lib/routes"

import { FieldMessage, PasswordField, SubmitButton } from "./form-fields"
import { getFormString, getTurnstileToken, zodFieldErrors } from "./form-utils"
import { resetPasswordSchema } from "../schemas/auth-schemas"
import { TurnstileWidget, type TurnstileWidgetHandle } from "./turnstile-widget"

type ResetPasswordFormProps = {
  token?: string
  userId?: string
}

export function ResetPasswordForm({ token = "", userId = "" }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword.form")
  const tErrors = useTranslations("auth.errors")
  const tValidation = useTranslations("auth.validation")

  const [fieldErrors, setFieldErrors] = React.useState<ValidationErrors>({})
  const [message, setMessage] = React.useState<{ text: string; tone: "danger" | "success" } | null>(null)
  const [pending, startTransition] = React.useTransition()
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null)

  const hasRequiredQuery = Boolean(token && userId)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const parsed = resetPasswordSchema.safeParse({
      confirmPassword: getFormString(formData, "confirmPassword"),
      newPassword: getFormString(formData, "newPassword"),
      token: getFormString(formData, "token"),
      turnstileToken: getTurnstileToken(formData),
      userId: getFormString(formData, "userId")
    })

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      if (parsed.error.issues.some((issue) => issue.path[0] === "turnstileToken")) {
        setMessage({ text: t("fallbackError"), tone: "danger" })
      }
      return
    }

    startTransition(async () => {
      try {
        await authRequest(AUTH_API_PATHS.resetPassword, {
          body: { newPassword: parsed.data.newPassword, token: parsed.data.token, turnstileToken: parsed.data.turnstileToken, userId: parsed.data.userId },
          method: "POST"
        })
        setMessage({ text: t("success"), tone: "success" })
      } catch (error) {
        if (error instanceof ApiProblemError) {
          setMessage({ text: tErrors(getProblemMessageKey(error.problem)), tone: "danger" })
        } else {
          setMessage({ text: t("fallbackError"), tone: "danger" })
        }
        turnstileRef.current?.reset()
      }
    })
  }

  if (!hasRequiredQuery) {
    return (
      <div className="grid gap-4">
        <FieldMessage tone="danger">{t("missingToken")}</FieldMessage>
        <Link className="text-sm font-medium text-primary" href={APP_ROUTES.login}>
          {t("backToLogin")}
        </Link>
      </div>
    )
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      {message ? <FieldMessage tone={message.tone}>{message.text}</FieldMessage> : null}
      <input name="userId" type="hidden" value={userId} />
      <input name="token" type="hidden" value={token} />
      <PasswordField autoComplete="new-password" disabled={pending} fieldErrors={fieldErrors} label={t("newPasswordLabel")} maxLength={128} minLength={12} name="newPassword" required translateError={tValidation} />
      <PasswordField autoComplete="new-password" disabled={pending} fieldErrors={fieldErrors} label={t("confirmPasswordLabel")} maxLength={128} minLength={12} name="confirmPassword" required translateError={tValidation} />
      <TurnstileWidget ref={turnstileRef} disabled={pending} />
      <SubmitButton disabled={pending}>{pending ? t("submitting") : t("submit")}</SubmitButton>
    </form>
  )
}
