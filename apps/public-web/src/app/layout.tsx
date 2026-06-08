import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { MessagingFloatingDock } from "@/features/messaging/components/messaging-floating-dock";
import { getRequestI18n } from "../../lib/i18n/request";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public-web");

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getRequestI18n();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} h-full font-sans antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-bootstrap"
          dangerouslySetInnerHTML={{
            __html: THEME_BOOTSTRAP_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground pt-14 md:pt-16">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <SiteHeader />
            <section className="w-full max-w-screen-xl mx-auto">
              {children}
            </section>
            <MessagingFloatingDock />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

const THEME_BOOTSTRAP_SCRIPT = `try{var key="norge360.theme";var saved=localStorage.getItem(key);var theme=saved==="light"||saved==="dark"||saved==="system"?saved:"system";var dark=theme==="dark"||theme==="system"&&matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";}catch{}`;
