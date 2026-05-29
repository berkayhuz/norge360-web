"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import * as React from "react"

import { authRequest } from "@/src/lib/api/auth-client"
import { AUTH_API_PATHS, APP_ROUTES } from "@/src/lib/routes"

import { FieldMessage } from "./form-fields"

export function LogoutPanel() {
  const router = useRouter()
  const t = useTranslations("auth.logout.panel")

  const [message, setMessage] = React.useState(t("inProgress"))

  React.useEffect(() => {
    let cancelled = false

    authRequest(AUTH_API_PATHS.logout, {
      body: {},
      method: "POST"
    })
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return
        setMessage(t("done"))
        router.replace(APP_ROUTES.login)
        router.refresh()
      })

    return () => {
      cancelled = true
    }
  }, [router, t])

  return <FieldMessage>{message}</FieldMessage>
}
