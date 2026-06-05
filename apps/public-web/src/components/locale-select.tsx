"use client";

import * as React from "react";
import { useLocale } from "next-intl";

import {
  getLocaleMetadata,
  getSupportedLocales,
  resolveLocale,
} from "@workspace/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/forms/select";
import { cn } from "@workspace/ui/lib/utils";

const LOCALE_COOKIE_NAME = "n360_locale";

type LocaleSelectProps = {
  label: string;
  className?: string;
};

export function LocaleSelect({ label, className }: LocaleSelectProps) {
  const locale = useLocale();
  const currentLocale = resolveLocale(locale) ?? getSupportedLocales()[0];

  const handleValueChange = React.useCallback((value: string) => {
    const nextLocale = resolveLocale(value);
    if (!nextLocale) return;

    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }, []);

  return (
    <Select value={currentLocale} onValueChange={handleValueChange}>
      <SelectTrigger
        aria-label={label}
        size="sm"
        className={cn(
          "h-8 w-[88px] rounded-full border-white/10 bg-white/5 text-[12px] text-inherit dark:bg-white/5",
          className,
        )}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent align="end">
        {getSupportedLocales().map((supportedLocale) => {
          const metadata = getLocaleMetadata(supportedLocale);

          return (
            <SelectItem key={supportedLocale} value={supportedLocale}>
              {metadata.nativeLabel}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
