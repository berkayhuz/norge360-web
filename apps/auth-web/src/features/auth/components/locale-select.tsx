"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import {
  getLocaleMetadata,
  getSupportedLocales,
  resolveLocale,
} from "@workspace/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/forms/select"

const LOCALE_COOKIE_NAME = "n360_locale"

type LocaleSelectProps = {
  label: string
}

export function LocaleSelect({ label }: LocaleSelectProps) {
  const router = useRouter()
  const currentLocale = useLocale()
  const resolvedCurrentLocale =
    resolveLocale(currentLocale) ?? getSupportedLocales()[0]

  const onValueChange = React.useCallback(
    (value: string) => {
      const nextLocale = resolveLocale(value)
      if (!nextLocale) return

      document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(
        nextLocale
      )}; Path=/; Max-Age=31536000; SameSite=Lax`

      router.refresh()
      window.location.reload()
    },
    [router]
  )

  return (
    <Select value={resolvedCurrentLocale} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        size="sm"
        className="h-8 w-auto min-w-28 text-xs"
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>

      <SelectContent align="end">
        {getSupportedLocales().map((locale) => {
          const metadata = getLocaleMetadata(locale)

          return (
            <SelectItem key={locale} value={locale}>
              {metadata.nativeLabel}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}