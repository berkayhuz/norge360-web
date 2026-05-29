import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"

import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"

import { ThemeProvider } from "@/components/theme-provider"
import { getRequestI18n } from "@/src/lib/i18n/request"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  description: "Norge360 authentication web application",
  title: "Norge360 Auth",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { locale, messages } = await getRequestI18n()

  return (
    <html className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)} lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
           <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

