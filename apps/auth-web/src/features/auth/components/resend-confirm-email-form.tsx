"use client"

import * as React from "react"
import { ApiProblemError } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import { AUTH_API_PATHS } from "@/src/lib/routes"
import { FieldMessage, SubmitButton, TextField } from "./form-fields"
import { getFormString, zodFieldErrors } from "./form-utils"
import { resendConfirmEmailSchema } from "../schemas/auth-schemas"
import type { ValidationErrors } from "@/src/lib/api/types"

export function ResendConfirmEmailForm() {
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
        setMessage({ text: "Hesap bulunursa dogrulama e-postasi yeniden gonderilecektir.", tone: "success" })
      } catch (error) {
        setMessage({ text: error instanceof ApiProblemError ? error.userMessage : "Istek gonderilemedi.", tone: "danger" })
      }
    })
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      {message ? <FieldMessage tone={message.tone}>{message.text}</FieldMessage> : null}
      <TextField autoComplete="email" disabled={pending} fieldErrors={fieldErrors} inputMode="email" label="E-posta" name="email" required type="email" />
      <SubmitButton disabled={pending}>{pending ? "Gonderiliyor..." : "Dogrulama e-postasini gonder"}</SubmitButton>
    </form>
  )
}
