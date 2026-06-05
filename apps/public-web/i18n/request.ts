import { getRequestConfig } from "next-intl/server"

import { getRequestI18n } from "../lib/i18n/request"

export default getRequestConfig(async () => {
  const { locale, messages } = await getRequestI18n()

  return {
    locale,
    messages,
  }
})
