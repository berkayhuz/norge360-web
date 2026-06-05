"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Image } from "@workspace/ui/components/primitives/image";
import { PostBody } from "@workspace/ui/components/app/social/post/post-body/post-body";
import { PostCard } from "@workspace/ui/components/app/social/post/post-card/post-card";

import { CommunityPostActions } from "@/features/community/components/community-post-actions";
import { CommunityPostCardUserHeaders } from "@/features/community/components/community-post-card-user-headers";
import type { CommunityFeedActions } from "@/features/community/lib/hooks";
import type { CommunityFeedItem } from "@/features/community/lib/types";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

const CAPTION_PREVIEW_LENGTH = 260;

export function CommunityPostCard({
  item,
  actions,
  readOnly = false,
  postHref = `/posts/${item.id}`,
}: {
  item: CommunityFeedItem;
  actions?: CommunityFeedActions;
  readOnly?: boolean;
  postHref?: string;
}) {
  const t = useTranslations("public-web");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (readOnly) {
      setIsAuthenticated(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await getClientAuthSessionStatus();
        if (!cancelled) setIsAuthenticated(response.authenticated);
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [readOnly]);

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

  const createdAtLabel = useMemo(() => {
    const date = new Date(item.createdAt);
    return Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }, [item.createdAt]);

  const onProtectedAction = async (callback: () => Promise<void>) => {
    if (!isAuthenticated) {
      window.location.href = getAuthWebLoginUrl();
      return;
    }
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
          postHref={postHref}
          showMenu={isAuthenticated}
        />
      }
      body={
        <PostBody
          media={
            hasMedia ? (
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {item.media.map((media, index) => (
                  <div key={media.id ?? `${media.url}-${index}`} className="min-w-full snap-start">
                    <Image
                      src={media.url}
                      alt={media.altText ?? item.caption ?? t("community.post.mediaAlt")}
                      aspect="video"
                      radius="xl"
                    />
                  </div>
                ))}
              </div>
            ) : null
          }
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
              onProtectedAction={onProtectedAction}
              postHref={postHref}
            />
          </div>
        ) : null
      }
    />
  );
}
