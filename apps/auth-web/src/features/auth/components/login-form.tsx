"use client"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"

import { Field, FieldGroup } from "@workspace/ui/components/field"

import { ApiProblemError, getProblemMessageKey } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import type { AuthIssuedSessionResponse, ValidationErrors } from "@/src/lib/api/types"
import { AUTH_API_PATHS, buildCallbackUrl } from "@/src/lib/routes"

import { FieldMessage, PasswordField, TextField } from "./form-fields"
import { getFormBoolean, getFormString, getOptionalFormString, getTurnstileToken, zodFieldErrors } from "./form-utils"
import { loginSchema } from "../schemas/auth-schemas"
import { cn } from "@workspace/ui/lib/utils"
import { TurnstileWidget, type TurnstileWidgetHandle } from "./turnstile-widget"
type LoginFormProps = {
  returnUrl?: string
  className?: string
}

export function LoginForm({ className, returnUrl }: LoginFormProps) {
  const router = useRouter()
  const t = useTranslations("auth.login.form")
  const tErrors = useTranslations("auth.errors")

  const [fieldErrors, setFieldErrors] = React.useState<ValidationErrors>({})
  const [formMessage, setFormMessage] = React.useState<string | null>(null)
  const [isMfaRequired, setIsMfaRequired] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const submitLockRef = React.useRef(false)
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || submitLockRef.current) return

    setFieldErrors({})
    setFormMessage(null)

    const formData = new FormData(event.currentTarget)
    const parsed = loginSchema.safeParse({
      emailOrUserName: getFormString(formData, "emailOrUserName"),
      mfaCode: getOptionalFormString(formData, "mfaCode"),
      password: getFormString(formData, "password"),
      recoveryCode: getOptionalFormString(formData, "recoveryCode"),
      rememberMe: getFormBoolean(formData, "rememberMe"),
      turnstileToken: getTurnstileToken(formData),
    })

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      if (parsed.error.issues.some((issue) => issue.path[0] === "turnstileToken")) {
        setFormMessage(t("fallbackError"))
      }
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)
    try {
      await authRequest<AuthIssuedSessionResponse>(AUTH_API_PATHS.login, {
        body: parsed.data,
        method: "POST"
      })
      router.push(buildCallbackUrl(returnUrl))
      router.refresh()
    } catch (error) {
      if (error instanceof ApiProblemError) {
        setFieldErrors(error.fieldErrors)
        setFormMessage(tErrors(getProblemMessageKey(error.problem)))
        if (error.problem.errorCode === "mfa_required") {
          setIsMfaRequired(true)
        }
        turnstileRef.current?.reset()
        return
      }

      setFormMessage(t("fallbackError"))
      turnstileRef.current?.reset()
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <form method="post" noValidate onSubmit={onSubmit}>
        <FieldGroup>
          {formMessage ? <FieldMessage tone="danger">{formMessage}</FieldMessage> : null}
          <Field>
            <TextField
              autoComplete="username" disabled={isSubmitting} fieldErrors={fieldErrors} label={t("emailOrUserNameLabel")} maxLength={256} name="emailOrUserName" required
            />
          </Field>
          <Field>
            <PasswordField autoComplete="current-password" disabled={isSubmitting} fieldErrors={fieldErrors} label={t("passwordLabel")} maxLength={256} name="password" required
            />
            {isMfaRequired ? (
              <div className="grid gap-4">
                <TextField autoComplete="one-time-code" disabled={isSubmitting} fieldErrors={fieldErrors} inputMode="numeric" label={t("mfaCodeLabel")} maxLength={32} name="mfaCode" />
                <TextField autoComplete="one-time-code" disabled={isSubmitting} fieldErrors={fieldErrors} label={t("recoveryCodeLabel")} maxLength={128} name="recoveryCode" placeholder={t("recoveryCodePlaceholder")} />
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox disabled={isSubmitting} name="rememberMe" />
                {t("rememberMe")}
              </label>
              <a href="/forgot-password" className="text-sm hover:underline">
                {t("forgotPassword")}
              </a>
            </div>

            <TurnstileWidget ref={turnstileRef} disabled={isSubmitting} />
            <Button disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
