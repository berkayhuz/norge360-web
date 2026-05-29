"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { ApiProblemError } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import type { AccountActionAcceptedResponse, AuthIssuedSessionResponse, ValidationErrors } from "@/src/lib/api/types"
import { AUTH_API_PATHS, buildCallbackUrl } from "@/src/lib/routes"

import { FieldMessage, PasswordField, SubmitButton, TextField } from "./form-fields"
import { getFormString, zodFieldErrors } from "./form-utils"
import { registerSchema } from "../schemas/auth-schemas"

type RegisterFormProps = {
  returnUrl?: string
}

export function RegisterForm({ returnUrl }: RegisterFormProps) {
  const router = useRouter()
  const [fieldErrors, setFieldErrors] = React.useState<ValidationErrors>({})
  const [message, setMessage] = React.useState<{ text: string; tone: "danger" | "success" } | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const submitLockRef = React.useRef(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || submitLockRef.current) return

    setFieldErrors({})
    setMessage(null)

    const formData = new FormData(event.currentTarget)
    const parsed = registerSchema.safeParse({
      culture: getFormString(formData, "culture") || "tr-TR",
      email: getFormString(formData, "email"),
      firstName: getFormString(formData, "firstName"),
      lastName: getFormString(formData, "lastName"),
      password: getFormString(formData, "password"),
      userName: getFormString(formData, "userName"),
    })

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)
    try {
      const result = await authRequest<AuthIssuedSessionResponse | AccountActionAcceptedResponse>(AUTH_API_PATHS.register, {
        body: parsed.data,
        method: "POST",
      })

      if ("message" in result) {
        setMessage({ text: "Kayit alindi. E-posta dogrulamasi gerekiyorsa gelen kutunuzu kontrol edin.", tone: "success" })
        return
      }

      router.push(buildCallbackUrl(returnUrl))
      router.refresh()
    } catch (error) {
      if (error instanceof ApiProblemError) {
        setFieldErrors(error.fieldErrors)
        setMessage({ text: error.userMessage, tone: "danger" })
      } else {
        setMessage({ text: error instanceof Error ? error.message : "Kayit tamamlanamadi.", tone: "danger" })
      }
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <form action="/register" className="grid gap-4" method="post" noValidate onSubmit={onSubmit}>
      {message ? <FieldMessage tone={message.tone}>{message.text}</FieldMessage> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField autoComplete="given-name" disabled={isSubmitting} fieldErrors={fieldErrors} label="Ad" name="firstName" />
        <TextField autoComplete="family-name" disabled={isSubmitting} fieldErrors={fieldErrors} label="Soyad" name="lastName" />
      </div>
      <TextField autoComplete="username" disabled={isSubmitting} fieldErrors={fieldErrors} label="Kullanici adi" maxLength={64} minLength={3} name="userName" required />
      <TextField autoComplete="email" disabled={isSubmitting} fieldErrors={fieldErrors} inputMode="email" label="E-posta" maxLength={256} name="email" required type="email" />
      <PasswordField autoComplete="new-password" disabled={isSubmitting} fieldErrors={fieldErrors} label="Sifre" maxLength={128} minLength={12} name="password" required />
      <input name="culture" type="hidden" value="tr-TR" />
      <SubmitButton disabled={isSubmitting}>{isSubmitting ? "Hesap olusturuluyor..." : "Hesap olustur"}</SubmitButton>
    </form>
  )
}
