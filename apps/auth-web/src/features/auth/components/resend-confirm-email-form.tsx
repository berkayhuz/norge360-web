"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { ApiProblemError, getProblemMessageKey } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import type { ValidationErrors } from "@/src/lib/api/types"
import { AUTH_API_PATHS } from "@/src/lib/routes"

import { FieldMessage, SubmitButton, TextField } from "./form-fields"
import { getFormString, zodFieldErrors } from "./form-utils"
import { resendConfirmEmailSchema } from "../schemas/auth-schemas"

export function ResendConfirmEmailForm() {
  const t = useTranslations("auth.resendConfirmEmail.form")
  const tErrors = useTranslations("auth.errors")

  const [fieldErrors, setFieldErrors] = React.useState<ValidationErrors>({})
  const [message, setMessage] = React.useState<{ text: string; tone: "danger" | "success" } | null>(null)
  const [pending, startTransition] = React.useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = resendConfirmEmailSchema.safeParse({ email: getFormString(new FormData(event.currentTarget), "email") })
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }

    startTransition(async () => {
      try {
        await authRequest(AUTH_API_PATHS.resendConfirmEmail, { body: parsed.data, method: "POST" })
        setMessage({ text: t("success"), tone: "success" })
      } catch (error) {
        if (error instanceof ApiProblemError) {
          setMessage({ text: tErrors(getProblemMessageKey(error.problem)), tone: "danger" })
        } else {
          setMessage({ text: tErrors("default"), tone: "danger" })
        }
      }
    })
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      {message ? <FieldMessage tone={message.tone}>{message.text}</FieldMessage> : null}
      <TextField autoComplete="email" disabled={pending} fieldErrors={fieldErrors} inputMode="email" label={t("emailLabel")} name="email" required type="email" />
      <SubmitButton disabled={pending}>{pending ? t("submitting") : t("submit")}</SubmitButton>
    </form>
  )
}
