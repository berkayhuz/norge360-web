"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui/components/primitives/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/overlay/dialog";

import type { CommunityFeedActions } from "@/features/community/lib/hooks";

export function CommunityDeletePostDialog({
  postId,
  actions,
  open,
  onOpenChange,
  trigger,
}: {
  postId: string;
  actions: CommunityFeedActions;
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
          <DialogTitle>{t("community.post.deleteTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("community.post.deleteDescription")}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>{t("community.post.deleteCancel")}</Button>
          <Button variant="destructive" onClick={() => void actions.deletePost(postId).then(() => onOpenChange?.(false))}>{t("community.post.deleteConfirm")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
