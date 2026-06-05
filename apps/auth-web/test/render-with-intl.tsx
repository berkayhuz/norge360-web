import type { ReactElement } from "react"
import { render } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import authMessages from "../../../packages/i18n/messages/en-US/auth.json"

const messages = {
  auth: authMessages
}

export const renderWithIntl = (ui: ReactElement): ReturnType<typeof render> => {
  return render(
    <NextIntlClientProvider locale="en-US" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}
