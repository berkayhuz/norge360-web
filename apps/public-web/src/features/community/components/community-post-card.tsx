"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { PostBody } from "@workspace/ui/components/app/social/post/post-body/post-body";
import { PostCard } from "@workspace/ui/components/app/social/post/post-card/post-card";

import { CommunityPostActions } from "@/features/community/components/community-post-actions";
import { CommunityPostCardUserHeaders } from "@/features/community/components/community-post-card-user-headers";
import { CommunityPostMediaViewer } from "@/features/community/components/community-post-media-viewer";
import type { CommunityFeedActions } from "@/features/community/lib/hooks";
import type { CommunityFeedItem } from "@/features/community/lib/types";

const CAPTION_PREVIEW_LENGTH = 260;

export function CommunityPostCard({
  item,
  actions,
  isAuthenticated = false,
  readOnly = false,
  postHref = item.author?.username && item.slug ? `/${item.author.username}/feed/${item.slug}` : "#",
}: {
  item: CommunityFeedItem;
  actions?: CommunityFeedActions;
  isAuthenticated?: boolean;
  readOnly?: boolean;
  postHref?: string;
}) {
  const t = useTranslations("public-web");

  const captionPreview = useMemo(() => {
    const caption = item.caption?.trim();
    if (!caption) {
      return { isTruncated: false, text: "" };
    }

    if (caption.length <= CAPTION_PREVIEW_LENGTH) {
      return { isTruncated: false, text: caption };
    }

    return { isTruncated: true, text: `${caption.slice(0, CAPTION_PREVIEW_LENGTH).trimEnd()}...` };
  }, [item.caption]);

  const onProtectedAction = async (callback: () => Promise<void>) => {
    await callback();
  };

  const hasMedia = item.media.length > 0;

  return (
    <PostCard
      header={
        <CommunityPostCardUserHeaders
          item={item}
          actions={actions}
          onProtectedAction={onProtectedAction}
          isAuthenticated={isAuthenticated}
          postHref={postHref}
          showMenu={Boolean(actions) || readOnly}
        />
      }
      body={
        <PostBody
          media={hasMedia ? <CommunityPostMediaViewer media={item.media} alt={item.caption ?? t("community.post.mediaAlt")} /> : null}
        >
          {item.caption ? (
            <div className="space-y-1">
              <Link href={postHref} className="block text-sm leading-6 text-foreground/90">
                <span className="whitespace-pre-wrap">{captionPreview.text}</span>
              </Link>
            </div>
          ) : null}
        </PostBody>
      }
      actions={
        actions ? (
          <div className="space-y-2">
            <CommunityPostActions
              item={item}
              actions={actions}
              isAuthenticated={isAuthenticated}
              onProtectedAction={onProtectedAction}
              postHref={postHref}
            />
          </div>
        ) : null
      }
    />
  );
}
