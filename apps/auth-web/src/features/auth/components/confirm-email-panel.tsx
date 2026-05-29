"use client"

import Link from "next/link"
import * as React from "react"

import { ApiProblemError } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import { AUTH_API_PATHS, APP_ROUTES } from "@/src/lib/routes"

import { FieldMessage } from "./form-fields"
import { confirmEmailSchema } from "../schemas/auth-schemas"

type ConfirmEmailPanelProps = {
  token?: string
  userId?: string
}

export function ConfirmEmailPanel({
  token = "",
  userId = "",
}: ConfirmEmailPanelProps) {
  const parsedRequest = React.useMemo(
    () => confirmEmailSchema.safeParse({ token, userId }),
    [token, userId]
  )
  const [state, setState] = React.useState<{
    message: string
    tone: "danger" | "neutral" | "success"
  }>(() =>
    parsedRequest.success
      ? { message: "E-posta doğrulanıyor...", tone: "neutral" }
      : {
          message:
            "E-posta doğrulama bağlantısı eksik veya geçersiz. E-postadaki bağlantıyı tekrar açın.",
          tone: "danger",
        }
  )

  React.useEffect(() => {
    if (!parsedRequest.success) {
      return
    }

    let cancelled = false

    authRequest(AUTH_API_PATHS.confirmEmail, {
      body: parsedRequest.data,
      method: "POST",
    })
      .then(() => {
        if (!cancelled) {
          setState({
            message:
              "E-posta adresiniz doğrulandı. Artık giriş yapabilirsiniz.",
            tone: "success",
          })
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          message:
            error instanceof ApiProblemError
              ? error.userMessage
              : "E-posta doğrulanamadı. Lütfen tekrar deneyin.",
          tone: "danger",
        })
      })

    return () => {
      cancelled = true
    }
  }, [parsedRequest])

  return (
    <div className="grid gap-4">
      <FieldMessage tone={state.tone}>{state.message}</FieldMessage>
      <Link
        className="text-sm font-medium text-primary"
        href={APP_ROUTES.login}
      >
        Giriş sayfasına dön
      </Link>
    </div>
  )
}
