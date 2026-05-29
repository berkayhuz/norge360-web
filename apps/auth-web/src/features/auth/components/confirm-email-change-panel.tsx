"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import * as React from "react"

import { ApiProblemError, getProblemMessageKey } from "@/src/lib/api/problem"
import { authRequest } from "@/src/lib/api/auth-client"
import { AUTH_API_PATHS, APP_ROUTES } from "@/src/lib/routes"

import { FieldMessage } from "./form-fields"
import { confirmEmailChangeSchema } from "../schemas/auth-schemas"

type ConfirmEmailChangePanelProps = {
  newEmail?: string
  token?: string
  userId?: string
}

export function ConfirmEmailChangePanel({ newEmail = "", token = "", userId = "" }: ConfirmEmailChangePanelProps) {
  const t = useTranslations("auth.confirmEmailChangePanel")
  const tErrors = useTranslations("auth.errors")

  const parsedRequest = React.useMemo(() => confirmEmailChangeSchema.safeParse({ newEmail, token, userId }), [newEmail, token, userId])
  const [state, setState] = React.useState<{ message: string; tone: "danger" | "neutral" | "success" }>(() =>
    parsedRequest.success
      ? { message: t("verifying"), tone: "neutral" }
      : { message: t("invalidLink"), tone: "danger" }
  )

  React.useEffect(() => {
    if (!parsedRequest.success) {
      return
    }

    let cancelled = false

    authRequest(AUTH_API_PATHS.confirmEmailChange, {
      body: parsedRequest.data,
      method: "POST"
    })
      .then(() => {
        if (!cancelled) {
          setState({ message: t("success"), tone: "success" })
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return

        if (error instanceof ApiProblemError) {
          setState({ message: tErrors(getProblemMessageKey(error.problem)), tone: "danger" })
        } else {
          setState({ message: t("fallbackError"), tone: "danger" })
        }
      })

    return () => {
      cancelled = true
    }
  }, [parsedRequest, t, tErrors])

  return (
    <div className="grid gap-4">
      <FieldMessage tone={state.tone}>{state.message}</FieldMessage>
      <Link className="text-sm font-medium text-primary" href={APP_ROUTES.login}>
        {t("backToLogin")}
      </Link>
    </div>
  )
}
