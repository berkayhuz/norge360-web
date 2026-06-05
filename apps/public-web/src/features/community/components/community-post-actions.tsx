"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bookmark, Heart, MessageCircle } from "lucide-react";

import { Button } from "@workspace/ui/components/primitives/button";
import { PostActions } from "@workspace/ui/components/app/social/post/post-actions/post-actions";

import { CommunityDeletePostDialog } from "@/features/community/components/community-delete-post-dialog";
import { CommunityEditPostDialog } from "@/features/community/components/community-edit-post-dialog";
import { CommunityReactionDialog } from "@/features/community/components/community-reaction-dialog";
import { CommunityReportDialog } from "@/features/community/components/community-report-dialog";
import type { CommunityFeedActions } from "@/features/community/lib/hooks";
import type { CommunityFeedItem } from "@/features/community/lib/types";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export function CommunityPostActions({
  item,
  actions,
  onProtectedAction,
  postHref = `/posts/${item.id}`,
}: {
  item: CommunityFeedItem;
  actions: CommunityFeedActions;
  onProtectedAction: (callback: () => Promise<void>) => Promise<void>;
  postHref?: string;
}) {
  const t = useTranslations("public-web");
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function protectedAction(callback: () => Promise<void>) {
    try {
      await onProtectedAction(callback);
    } catch {
      window.location.href = getAuthWebLoginUrl();
    }
  }

  return (
    <>
      <PostActions
        leading={
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              rounded="full"
              border="none"
              aria-label={t("community.post.like")}
              className={item.isLikedByCurrentUser ? "text-rose-500 hover:bg-transparent hover:text-rose-500" : "text-muted-foreground hover:bg-transparent hover:text-foreground"}
              onClick={() => void protectedAction(() => actions.toggleLike(item.id, !!item.isLikedByCurrentUser))}
            >
              <Heart className="size-6" fill={item.isLikedByCurrentUser ? "currentColor" : "none"} />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              rounded="full"
              border="none"
              aria-label={t("community.post.comment")}
              className="cursor-default text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <Link href={`${postHref}#comments`}>
                <MessageCircle className="size-6" />
              </Link>
            </Button>
          </>
        }
        trailing={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            rounded="full"
            border="none"
            aria-label={t("community.post.save")}
            className={item.isSavedByCurrentUser ? "text-foreground hover:bg-transparent" : "text-muted-foreground hover:bg-transparent hover:text-foreground"}
            onClick={() => void protectedAction(() => actions.toggleSave(item.id, !!item.isSavedByCurrentUser))}
          >
            <Bookmark className="size-6" fill={item.isSavedByCurrentUser ? "currentColor" : "none"} />
          </Button>
        }
      />

      <CommunityReactionDialog
        currentReaction={item.currentUserReaction ?? null}
        onAdd={(emoji) => protectedAction(() => actions.setReaction(item.id, emoji))}
        onOpenChange={setReactionOpen}
        onRemove={() => protectedAction(() => actions.removeReaction(item.id))}
        open={reactionOpen}
      />
      <CommunityReportDialog
        onOpenChange={setReportOpen}
        onSubmit={(reason, description) => protectedAction(() => actions.reportPost(item.id, reason, description))}
        open={reportOpen}
      />
      {item.canEdit ? (
        <CommunityEditPostDialog
          actions={actions}
          item={item}
          onOpenChange={setEditOpen}
          open={editOpen}
        />
      ) : null}
      {item.canDelete ? (
        <CommunityDeletePostDialog
          actions={actions}
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
          postId={item.id}
        />
      ) : null}
    </>
  );
}
