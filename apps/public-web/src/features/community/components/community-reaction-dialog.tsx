"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui/components/primitives/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/overlay/dialog";

const REACTIONS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F525}"] as const;

export function CommunityReactionDialog({
  currentReaction,
  onAdd,
  onRemove,
  open,
  onOpenChange,
  trigger,
}: {
  currentReaction: string | null;
  onAdd: (emoji: string) => Promise<void>;
  onRemove: () => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const t = useTranslations("public-web");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("community.reaction.add")}</DialogTitle>
        </DialogHeader>
        {currentReaction ? <p className="text-xs text-muted-foreground">{t("community.reaction.current", { reaction: currentReaction })}</p> : null}
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="outline"
              onClick={() => void onAdd(emoji).then(() => onOpenChange?.(false))}
            >
              {emoji}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => void onRemove().then(() => onOpenChange?.(false))}
          >
            {t("community.reaction.remove")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
