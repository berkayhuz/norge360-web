import { getLocale } from "next-intl/server";

import { LegalPage } from "@/features/legal/legal-page";
import { getLegalPageContent } from "@/features/legal/legal-content";

export default async function AboutPage() {
  const locale = await getLocale();
  return <LegalPage content={getLegalPageContent(locale, "about")} />;
}
