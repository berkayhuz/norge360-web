# @workspace/i18n

Centralized frontend i18n foundation for Norge360 apps and shared UI packages.

## Scope
- Frontend/package-level locale infrastructure only.
- No backend integration, no DB, no auth/session, no cookie/localStorage persistence.

## Supported locales
- `nb-NO` (default)
- `en-US` (fallback)
- `sv-SE`
- `da-DK`
- `de-DE`

## Exports
- `@workspace/i18n`
- `@workspace/i18n/core`
- `@workspace/i18n/messages`
- `@workspace/i18n/format`
- `@workspace/i18n/next`
- `@workspace/i18n/testing`

## Why separate from @norge360/design
`@norge360/design` stays visual/component focused. `@workspace/i18n` owns locale rules, message loading, validation, typing, and i18n runtime helpers.

## Usage (future Next.js apps)
```ts
import { createNextIntlRequestConfig } from "@workspace/i18n/next";

export default async function getRequestConfig({ requestLocale }: { requestLocale: string }) {
  return createNextIntlRequestConfig(requestLocale);
}
```

```tsx
// app/[locale]/layout.tsx (example)
import { NextIntlClientProvider } from "next-intl";
import { createNextIntlRequestConfig } from "@workspace/i18n/next";

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const { locale, messages } = await createNextIntlRequestConfig(params.locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

```tsx
// Client component example
"use client";
import { useTranslations } from "next-intl";

export function SaveButton() {
  const t = useTranslations("common");
  return <button>{t("save")}</button>;
}
```

## Message model
- Namespace-based files under `messages/<locale>/<namespace>.json`.
- Canonical schema source is `en-US`.
- ICU syntax supported for interpolation/plurals/dates/numbers/currency.

## Security rules
- Only local build-time JSON files.
- No remote runtime message loading.
- No arbitrary HTML in translations.
- No `dangerouslySetInnerHTML` usage.
- Locale loading only through known locale import maps.

## Validation
Run:
- `pnpm --filter @workspace/i18n i18n:check`

Checks include:
- locale folder parity with supported locales
- namespace parity
- key-structure parity
- valid JSON
- valid ICU messages
- no HTML tags
- no empty values

## Formatting helpers
- `formatDate`
- `formatDateTime`
- `formatNumber`
- `formatCurrency`
- `formatPercent`
- `formatList`
- `formatRelativeTime`

All helpers accept `SupportedLocale` and are server-safe (native `Intl` only).

## Adding a locale
1. Add locale to `SUPPORTED_LOCALES`.
2. Add locale metadata.
3. Add `messages/<locale>/` namespace files.
4. Add locale importers in `load-messages.ts`.
5. Run `pnpm i18n:check` and tests.

## Out of scope for now
- backend/user settings persistence
- auth/session locale derivation
- cookie/localStorage locale storage
