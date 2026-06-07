"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { EllipsisVertical } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import { PostHeader } from "@workspace/ui/components/app/social/post/post-header/post-header";

import { CommunityDeletePostDialog } from "@/features/community/components/community-delete-post-dialog";
import { CommunityEditPostDialog } from "@/features/community/components/community-edit-post-dialog";
import { CommunityReactionDialog } from "@/features/community/components/community-reaction-dialog";
import { CommunityReportDialog } from "@/features/community/components/community-report-dialog";
import type { CommunityFeedActions } from "@/features/community/lib/hooks";
import type { CommunityFeedItem } from "@/features/community/lib/types";
import { getCommunityLocationLabel } from "@/features/community/lib/location-options";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { formatRelativeTimeLabel } from "@/lib/date-format";

export function CommunityPostCardUserHeaders({
  item,
  actions,
  onProtectedAction,
  showMenu = true,
}: {
  item: CommunityFeedItem;
  actions?: CommunityFeedActions;
  onProtectedAction?: (callback: () => Promise<void>) => Promise<void>;
  postHref?: string;
  isAuthenticated?: boolean;
  showMenu?: boolean;
}) {
  const t = useTranslations("public-web");
  const tNavigation = useTranslations("navigation");
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const authorName = item.author?.displayName ?? item.author?.username ?? t("community.post.authorFallback");
  const authorInitials = useMemo(() => {
    const parts = authorName.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]).join("");
    return (initials || authorName.slice(0, 2) || "N").toUpperCase();
  }, [authorName]);

  const locationLabel = useMemo(
    () => getCommunityLocationLabel(item.city ?? null, item.district ?? null) ?? t("community.location.general"),
    [item.city, item.district, t],
  );

  const createdAtLabel = useMemo(() => formatRelativeTimeLabel(item.createdAt) ?? "", [item.createdAt]);
  const isOwnerPost = item.canDelete || item.canEdit;
  const commentsEnabled = item.commentsEnabled ?? true;
  const hideLikeCounts = item.hideLikeCountOverride ?? item.author?.hideLikeCounts ?? false;

  async function protectedAction(callback: () => Promise<void>) {
    if (!onProtectedAction) {
      window.location.href = getAuthWebLoginUrl();
      return;
    }

    try {
      await onProtectedAction(callback);
    } catch {
      window.location.href = getAuthWebLoginUrl();
    }
  }

  const menu =
    showMenu && actions ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            rounded="full"
            border="none"
            aria-label={tNavigation("moreActions")}
            className="text-muted-foreground hover:text-foreground shrink-0 size-9"
          >
            <EllipsisVertical className="size-5 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {isOwnerPost ? (
            <>
              {item.canEdit ? (
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  {t("community.post.edit")}
                </DropdownMenuItem>
              ) : null}
              {item.canEdit && item.canDelete ? <DropdownMenuSeparator /> : null}
              {item.canEdit && actions ? (
                <DropdownMenuItem onSelect={() => void protectedAction(() => actions.setCommentsEnabled(item.id, !commentsEnabled))}>
                  {commentsEnabled ? t("community.post.disableComments") : t("community.post.enableComments")}
                </DropdownMenuItem>
              ) : null}
              {item.canEdit && actions ? (
                <DropdownMenuItem onSelect={() => void protectedAction(() => actions.setHideLikeCount(item.id, !hideLikeCounts))}>
                  {hideLikeCounts ? t("community.post.showLikeCounts") : t("community.post.hideLikeCounts")}
                </DropdownMenuItem>
              ) : null}
              {item.canEdit && actions ? <DropdownMenuSeparator /> : null}
              {item.canDelete ? (
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                  {t("community.post.delete")}
                </DropdownMenuItem>
              ) : null}
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => setReactionOpen(true)}>
                {t("community.reaction.add")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void protectedAction(() => actions.setInterest(item.id, "Interested"))}>
                {t("community.post.interested")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void protectedAction(() => actions.setInterest(item.id, "NotInterested"))}>
                {t("community.post.notInterested")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                {t("community.post.report")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  return (
    <>
      <PostHeader menu={menu}>
        <Link href={`/${item.author?.username}`} className="flex min-w-0 items-center gap-3">
          <Avatar className="mt-0.5" size="lg">
            <AvatarImage src={item.author?.avatarUrl ?? undefined} alt={authorName} />
            <AvatarFallback>{authorInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
            <div className="flex items-center gap-1">
              <p className="truncate text-xs text-muted-foreground">{locationLabel}</p>
              {createdAtLabel ? <span className="text-xs text-muted-foreground">·</span> : null}
              {createdAtLabel ? <span className="text-xs text-muted-foreground">{createdAtLabel}</span> : null}
            </div>
          </div>
        </Link>
      </PostHeader>

      {actions ? (
        <>
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
      ) : null}
    </>
  );
}
