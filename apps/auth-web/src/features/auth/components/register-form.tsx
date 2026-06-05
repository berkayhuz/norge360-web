"use client"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import * as React from "react"
import { FieldGroup } from "@workspace/ui/components/primitives/field"

import { ApiProblemError, getProblemMessageKey } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import type { AccountActionAcceptedResponse, AuthIssuedSessionResponse, ValidationErrors } from "@/src/lib/api/types"
import {
  AUTH_API_PATHS,
  AUTH_FLOW_SOURCES,
  buildCallbackUrl,
} from "@/src/lib/routes"

import { FieldMessage, PasswordField, SubmitButton, TextField } from "./form-fields"
import { getFormString, getTurnstileToken, zodFieldErrors } from "./form-utils"
import { registerSchema } from "../schemas/auth-schemas"
import { TurnstileWidget, type TurnstileWidgetHandle } from "./turnstile-widget"

type RegisterFormProps = {
  locale?: string
}

export function RegisterForm({ locale = "en-US" }: RegisterFormProps) {
  const router = useRouter()
  const t = useTranslations("auth.register.form")
  const tErrors = useTranslations("auth.errors")

  const [fieldErrors, setFieldErrors] = React.useState<ValidationErrors>({})
  const [message, setMessage] = React.useState<{ text: string; tone: "danger" | "success" } | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const submitLockRef = React.useRef(false)
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || submitLockRef.current) return

    setFieldErrors({})
    setMessage(null)

    const formData = new FormData(event.currentTarget)
    const parsed = registerSchema.safeParse({
      culture: getFormString(formData, "culture") || locale,
      email: getFormString(formData, "email"),
      firstName: getFormString(formData, "firstName"),
      lastName: getFormString(formData, "lastName"),
      password: getFormString(formData, "password"),
      turnstileToken: getTurnstileToken(formData),
      userName: getFormString(formData, "userName")
    })

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      if (parsed.error.issues.some((issue) => issue.path[0] === "turnstileToken")) {
        setMessage({ text: t("fallbackError"), tone: "danger" })
      }
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)
    try {
      const result = await authRequest<AuthIssuedSessionResponse | AccountActionAcceptedResponse>(AUTH_API_PATHS.register, {
        body: parsed.data,
        method: "POST"
      })

      if ("message" in result) {
        setMessage({ text: t("accepted"), tone: "success" })
        turnstileRef.current?.reset()
        return
      }

      router.push(buildCallbackUrl(undefined, AUTH_FLOW_SOURCES.register))
      router.refresh()
    } catch (error) {
      if (error instanceof ApiProblemError) {
        setFieldErrors(error.fieldErrors)
        setMessage({ text: tErrors(getProblemMessageKey(error.problem)), tone: "danger" })
      } else {
        setMessage({ text: t("fallbackError"), tone: "danger" })
      }
      turnstileRef.current?.reset()
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <form action="/register" className="flex flex-col gap-6" method="post" noValidate onSubmit={onSubmit}>
      <FieldGroup>
        {message ? <FieldMessage tone={message.tone}>{message.text}</FieldMessage> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField autoComplete="given-name" disabled={isSubmitting} fieldErrors={fieldErrors} label={t("firstNameLabel")} name="firstName" />
          <TextField autoComplete="family-name" disabled={isSubmitting} fieldErrors={fieldErrors} label={t("lastNameLabel")} name="lastName" />
        </div>
        <TextField autoComplete="username" disabled={isSubmitting} fieldErrors={fieldErrors} label={t("userNameLabel")} maxLength={64} minLength={3} name="userName" required />
        <TextField autoComplete="email" disabled={isSubmitting} fieldErrors={fieldErrors} inputMode="email" label={t("emailLabel")} maxLength={256} name="email" required type="email" />
        <PasswordField autoComplete="new-password" disabled={isSubmitting} fieldErrors={fieldErrors} label={t("passwordLabel")} maxLength={128} minLength={12} name="password" required />
        <TurnstileWidget ref={turnstileRef} disabled={isSubmitting} />
        <input name="culture" type="hidden" value={locale} />
        <SubmitButton disabled={isSubmitting}>{isSubmitting ? t("submitting") : t("submit")}</SubmitButton>
      </FieldGroup>
    </form>
  )
}
