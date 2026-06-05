"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";

type Props = {
  username: string;
  profileId: string;
};

type RelationPayload = {
  blockedProfileIds: string[];
  blockerProfileIds: string[];
};

export function ProfileActionsMenu({ username, profileId }: Props) {
  const t = useTranslations("public-web");
  const translate = t as unknown as (key: string) => string;
  const [loading, setLoading] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/accounts/blocks/me/relations", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as RelationPayload;
        if (cancelled) return;
        const blocked = Array.isArray(payload.blockedProfileIds) && payload.blockedProfileIds.includes(profileId);
        setBlockedByMe(blocked);
      } catch {
        // no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const blockLabel = useMemo(
    () => (blockedByMe ? translate("profile.actionsMenu.unblock") : translate("profile.actionsMenu.block")),
    [blockedByMe, translate],
  );

  async function onToggleBlock() {
    setLoading(true);
    try {
      const endpoint = `/api/accounts/blocks/${encodeURIComponent(username)}`;
      const method = blockedByMe ? "DELETE" : "POST";
      const response = await fetch(endpoint, { method });
      if (response.ok || response.status === 204) {
        setBlockedByMe((value) => !value);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={translate("profile.actionsMenu.ariaLabel")} size="icon" type="button" variant="outline">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={loading} onClick={onToggleBlock}>
          {blockLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.alert(translate("profile.actionsMenu.reportSoon"))}>
          {translate("profile.actionsMenu.report")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
