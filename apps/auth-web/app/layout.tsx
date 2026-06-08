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
  metadataBase: new URL("https://auth.norge360.com"),

  title: {
    default: "Norge360 Auth",
    template: "%s | Norge360 Auth",
  },

  description: "Secure authentication for Norge360 accounts.",

  applicationName: "Norge360 Auth",
  generator: "Next.js",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },

  icons: {
    icon: [
      { url: "https://cdn.norge360.com/brand/logo/favicon.ico" },
      { url: "https://cdn.norge360.com/brand/logo/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "https://cdn.norge360.com/brand/logo/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "https://cdn.norge360.com/brand/logo/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },

  openGraph: {
    type: "website",
    siteName: "Norge360",
    title: "Norge360 Auth",
    description: "Secure authentication for Norge360 accounts.",
    url: "https://auth.norge360.com"
  },

  twitter: {
    card: "summary_large_image",
    title: "Norge360 Auth",
    description: "Secure authentication for Norge360 accounts."
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { locale, messages } = await getRequestI18n()

  return (
    <html className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)} lang={locale} suppressHydrationWarning>
      <head>
        <script id="theme-bootstrap" dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

const THEME_BOOTSTRAP_SCRIPT =
  `try{var key="norge360.theme";var saved=localStorage.getItem(key);var theme=saved==="light"||saved==="dark"||saved==="system"?saved:"system";var dark=theme==="dark"||theme==="system"&&matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";}catch{}`
