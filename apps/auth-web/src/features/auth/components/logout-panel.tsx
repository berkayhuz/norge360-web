"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { authRequest } from "@/src/lib/api/auth-client"
import { AUTH_API_PATHS, APP_ROUTES } from "@/src/lib/routes"

import { FieldMessage } from "./form-fields"

export function LogoutPanel() {
  const router = useRouter()
  const [message, setMessage] = React.useState("Oturum kapatılıyor...")

  React.useEffect(() => {
    let cancelled = false

    authRequest(AUTH_API_PATHS.logout, {
      body: {},
      method: "POST",
    })
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return
        setMessage("Oturum kapatıldı. Giriş sayfasına yönlendiriliyorsunuz.")
        router.replace(APP_ROUTES.login)
        router.refresh()
      })

    return () => {
      cancelled = true
    }
  }, [router])

  return <FieldMessage>{message}</FieldMessage>
}
