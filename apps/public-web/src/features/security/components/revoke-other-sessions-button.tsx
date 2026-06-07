"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@workspace/ui/components/primitives/button";

export function RevokeOtherSessionsButton() {
  const t = useTranslations("public-web");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function onClick() {
    setHasError(false);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/sessions/revoke-others", {
          credentials: "include",
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("revoke_others_failed");
        }

        router.refresh();
      } catch {
        setHasError(true);
      }
    });
  }

  return (
    <Button disabled={isPending} onClick={onClick} variant="outline">
      {isPending ? t("settings.security.actions.saving") : hasError ? t("settings.security.sessions.actionsError") : t("settings.security.sessions.revokeOthers")}
    </Button>
  );
}
