"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function CommunityFooter() {
  const t = useTranslations("public-web");

  return (
    <div className="space-y-2 px-2">
      <div className="flex items-center justify-between space-x-2">
        <Link href="/about" className="text-xs text-muted-foreground hover:underline">
          {t("communityFooter.about")}
        </Link>
        <Link href="/accessibility" className="text-xs text-muted-foreground hover:underline">
          {t("communityFooter.accessibility")}
        </Link>
        <Link href="/help" className="text-xs text-muted-foreground hover:underline">
          {t("communityFooter.help")}
        </Link>
        <Link href="/services" className="text-xs text-muted-foreground hover:underline">
          {t("communityFooter.services")}
        </Link>
        <Link href="/settings" className="text-xs text-muted-foreground hover:underline">
          {t("communityFooter.settings")}
        </Link>
      </div>
      <Link href="/" className="flex w-full items-center justify-center space-x-1 text-center text-xs text-muted-foreground">
        <span className="hover:underline">{t("communityFooter.copyright", { year: new Date().getFullYear() })}</span>
      </Link>
    </div>
  );
}
