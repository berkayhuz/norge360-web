"use client"

import Script from "next/script"
import * as React from "react"

type TurnstileWidgetProps = {
  disabled?: boolean
}

export type TurnstileWidgetHandle = {
  reset: () => void
}

declare global {
  interface Window {
    turnstile?: {
      reset: (container?: string | HTMLElement) => void
      render: (
        container: string | HTMLElement,
        options: {
          callback?: (token: string) => void
          size?: "flexible" | "compact"
          sitekey: string
          theme?: "light" | "dark" | "auto"
        }
      ) => string
    }
  }
}

export const TurnstileWidget = React.forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { disabled = false },
  ref
) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? (process.env.NODE_ENV === "test" ? "test-site-key" : "")
  const widgetRef = React.useRef<HTMLDivElement | null>(null)
  const widgetIdRef = React.useRef<string | null>(null)
  const [token, setToken] = React.useState("")
  const [scriptReady, setScriptReady] = React.useState(false)

  React.useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      setToken("test-turnstile-token")
    }
  }, [])

  React.useEffect(() => {
    if (!scriptReady || !widgetRef.current || process.env.NODE_ENV === "test") {
      return
    }

    if (widgetIdRef.current) {
      return
    }

    widgetIdRef.current = window.turnstile?.render(widgetRef.current, {
      callback: (nextToken: string) => setToken(nextToken),
      theme: "auto",
      size: "flexible",
      sitekey: siteKey,
    }) ?? null
  }, [scriptReady])

  const reset = React.useCallback(() => {
    setToken("")
    if (widgetIdRef.current) {
      window.turnstile?.reset(widgetIdRef.current)
      return
    }

    window.turnstile?.reset(widgetRef.current ?? undefined)
  }, [])

  React.useImperativeHandle(ref, () => ({ reset }), [reset])

  if (!siteKey) {
    return null
  }

  return (
    <>
      <Script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js" onLoad={() => setScriptReady(true)} />
      <div
        ref={widgetRef}
        data-sitekey={siteKey}
        aria-disabled={disabled}
      />
      <input name="cf-turnstile-response" type="hidden" value={token} readOnly />
    </>
  )
})
