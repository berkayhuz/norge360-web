"use client"

import { useTranslations } from "next-intl"
import * as React from "react"

import { ApiProblemError, getProblemMessageKey } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import type { ValidationErrors } from "@/src/lib/api/types"
import { AUTH_API_PATHS } from "@/src/lib/routes"

import { FieldMessage, SubmitButton, TextField } from "./form-fields"
import { getFormString, getTurnstileToken, zodFieldErrors } from "./form-utils"
import { forgotPasswordSchema } from "../schemas/auth-schemas"
import { TurnstileWidget, type TurnstileWidgetHandle } from "./turnstile-widget"

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword.form")
  const tErrors = useTranslations("auth.errors")
  const tValidation = useTranslations("auth.validation")

  const [fieldErrors, setFieldErrors] = React.useState<ValidationErrors>({})
  const [message, setMessage] = React.useState<{ text: string; tone: "danger" | "success" } | null>(null)
  const [pending, startTransition] = React.useTransition()
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const parsed = forgotPasswordSchema.safeParse({
      email: getFormString(formData, "email"),
      turnstileToken: getTurnstileToken(formData),
    })
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      if (parsed.error.issues.some((issue) => issue.path[0] === "turnstileToken")) {
        setMessage({ text: tErrors("default"), tone: "danger" })
      }
      return
    }

    startTransition(async () => {
      try {
        await authRequest(AUTH_API_PATHS.forgotPassword, { body: parsed.data, method: "POST" })
        setMessage({ text: t("success"), tone: "success" })
      } catch (error) {
        if (error instanceof ApiProblemError) {
          setMessage({ text: tErrors(getProblemMessageKey(error.problem)), tone: "danger" })
        } else {
          setMessage({ text: tErrors("default"), tone: "danger" })
        }
        turnstileRef.current?.reset()
      }
    })
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      {message ? <FieldMessage tone={message.tone}>{message.text}</FieldMessage> : null}
      <TextField autoComplete="email" disabled={pending} fieldErrors={fieldErrors} inputMode="email" label={t("emailLabel")} name="email" required type="email" translateError={tValidation} />
      <TurnstileWidget ref={turnstileRef} disabled={pending} />
      <SubmitButton disabled={pending}>{pending ? t("submitting") : t("submit")}</SubmitButton>
    </form>
  )
}
