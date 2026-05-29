import type { AbstractIntlMessages } from "next-intl";
import type { SupportedLocale } from "../core";
import type { Messages } from "./types";

declare module "next-intl" {
  interface AppConfig {
    Locale: SupportedLocale;
    Messages: Messages & AbstractIntlMessages;
  }
}

export {};
