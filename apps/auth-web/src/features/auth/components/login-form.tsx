"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { ApiProblemError } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import type { AuthIssuedSessionResponse, ValidationErrors } from "@/src/lib/api/types"
import { APP_ROUTES, AUTH_API_PATHS, buildCallbackUrl } from "@/src/lib/routes"

import {
  FieldMessage,
  PasswordField,
  SubmitButton,
  TextField,
} from "./form-fields"
import {
  getFormBoolean,
  getFormString,
  getOptionalFormString,
  zodFieldErrors,
} from "./form-utils"
import { loginSchema } from "../schemas/auth-schemas"

type LoginFormProps = {
  returnUrl?: string
}

export function LoginForm({ returnUrl }: LoginFormProps) {
  const router = useRouter()
  const [fieldErrors, setFieldErrors] = React.useState<ValidationErrors>({})
  const [formMessage, setFormMessage] = React.useState<string | null>(null)
  const [isMfaRequired, setIsMfaRequired] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const submitLockRef = React.useRef(false)

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
    })

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)
    try {
      await authRequest<AuthIssuedSessionResponse>(AUTH_API_PATHS.login, {
        body: parsed.data,
        method: "POST",
      })
      router.push(buildCallbackUrl(returnUrl))
      router.refresh()
    } catch (error) {
      if (error instanceof ApiProblemError) {
        setFieldErrors(error.fieldErrors)
        setFormMessage(error.userMessage)
        if (error.problem.errorCode === "mfa_required") {
          setIsMfaRequired(true)
        }
        return
      }

      setFormMessage(
        error instanceof Error
          ? error.message
          : "Giriş tamamlanamadı. Lütfen tekrar deneyin."
      )
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <form className="grid gap-4" method="post" noValidate onSubmit={onSubmit}>
      {formMessage ? (
        <FieldMessage tone="danger">{formMessage}</FieldMessage>
      ) : null}

      <TextField
        autoComplete="username"
        disabled={isSubmitting}
        fieldErrors={fieldErrors}
        label="E-posta veya kullanıcı adı"
        maxLength={256}
        name="emailOrUserName"
        required
      />
      <PasswordField
        autoComplete="current-password"
        disabled={isSubmitting}
        fieldErrors={fieldErrors}
        label="Şifre"
        maxLength={256}
        name="password"
        required
      />
      {isMfaRequired ? (
        <div className="grid gap-4">
          <TextField
            autoComplete="one-time-code"
            disabled={isSubmitting}
            fieldErrors={fieldErrors}
            inputMode="numeric"
            label="MFA kodu"
            maxLength={32}
            name="mfaCode"
          />
          <TextField
            autoComplete="one-time-code"
            disabled={isSubmitting}
            fieldErrors={fieldErrors}
            label="Kurtarma kodu"
            maxLength={128}
            name="recoveryCode"
            placeholder="MFA kodunuz yoksa"
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            className="size-4 rounded border-input accent-primary"
            disabled={isSubmitting}
            name="rememberMe"
            type="checkbox"
          />
          Beni hatırla
        </label>
        <Link
          className="font-medium text-primary hover:underline"
          href={APP_ROUTES.forgotPassword}
        >
          Şifremi unuttum
        </Link>
      </div>

      <SubmitButton disabled={isSubmitting}>
        {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
      </SubmitButton>
    </form>
  )
}
