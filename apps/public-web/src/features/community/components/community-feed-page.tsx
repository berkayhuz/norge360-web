"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Input } from "@workspace/ui/components/forms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/forms/select";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { Image } from "@workspace/ui/components/primitives/image";
import { Button } from "@workspace/ui/components/primitives/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";

import { CommunityPageScaffold } from "@/features/community/components/community-page-scaffold";
import {
  CommentImageEditorDialog,
  type CommentAttachment,
} from "@/features/community/components/community-comment-image-editor-dialog";
import { CommunityPostCard } from "@/features/community/components/community-post-card";
import { useCommunityFeed } from "@/features/community/lib/hooks";
import {
  COMMUNITY_LOCATION_OPTIONS,
  DEFAULT_COMMUNITY_LOCATION,
  getCommunityDistrictOptions,
} from "@/features/community/lib/location-options";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";
import { optimizeImageFile } from "@/lib/image-optimize";

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const ALLOWED_POST_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type FeedSortOption = "best" | "new" | "liked" | "commented" | "trending";
const ALL_CITIES_VALUE = "__all_cities__";
const ALL_DISTRICTS_VALUE = "__all_districts__";

type FeedSortLabelKey =
  | "community.feed.sortBest"
  | "community.feed.sortNew"
  | "community.feed.sortLiked"
  | "community.feed.sortCommented"
  | "community.feed.sortTrending";

const FEED_SORT_OPTIONS: Array<{ labelKey: FeedSortLabelKey; value: FeedSortOption }> = [
  { labelKey: "community.feed.sortBest", value: "best" },
  { labelKey: "community.feed.sortNew", value: "new" },
  { labelKey: "community.feed.sortLiked", value: "liked" },
  { labelKey: "community.feed.sortCommented", value: "commented" },
  { labelKey: "community.feed.sortTrending", value: "trending" },
];

type FilteredFeedResult = {
  primaryItems: ReturnType<typeof useCommunityFeed>["items"];
  fallbackItems: ReturnType<typeof useCommunityFeed>["items"];
  message: string | null;
};

export function CommunityFeedPage() {
  const t = useTranslations("public-web");
  const tCommon = useTranslations("common");
  const { actions, error, hasNextPage, items, loadInitial, loadMore, loading } = useCommunityFeed();
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialLoadStartedRef = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [caption, setCaption] = useState("");
  const [postCity, setPostCity] = useState(DEFAULT_COMMUNITY_LOCATION.city);
  const [postDistrict, setPostDistrict] = useState(DEFAULT_COMMUNITY_LOCATION.district);
  const [imageAttachments, setImageAttachments] = useState<CommentAttachment[]>([]);
  const imageAttachmentsRef = useRef<CommentAttachment[]>([]);
  const [activeImageAttachmentId, setActiveImageAttachmentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [sortBy, setSortBy] = useState<FeedSortOption>("best");
  const [sortReferenceTime] = useState(() => Date.now());
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const selectedCityOptions = useMemo(() => (selectedCity ? getCommunityDistrictOptions(selectedCity) : []), [selectedCity]);
  const postDistrictOptions = getCommunityDistrictOptions(postCity);
  const activeImageAttachment = useMemo(
    () => imageAttachments.find((attachment) => attachment.id === activeImageAttachmentId) ?? null,
    [activeImageAttachmentId, imageAttachments],
  );

  useEffect(() => {
    imageAttachmentsRef.current = imageAttachments;
  }, [imageAttachments]);

  useEffect(() => {
    return () => {
      for (const attachment of imageAttachmentsRef.current) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (initialLoadStartedRef.current) {
      return;
    }
    initialLoadStartedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const response = await getClientAuthSessionStatus();
        if (!cancelled) {
          setIsAuthenticated(response.authenticated);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      }
    })();

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [loadInitial]);

  useEffect(() => {
    if (!selectedCity) {
      queueMicrotask(() => setSelectedDistrict(""));
      return;
    }

    const districtExists = selectedCityOptions.some((option) => option.value === selectedDistrict);
    if (!districtExists) {
      queueMicrotask(() => setSelectedDistrict(""));
    }
  }, [selectedCity, selectedCityOptions, selectedDistrict]);

  const feedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((left, right) => {
      const leftLikes = left.likesCount ?? 0;
      const rightLikes = right.likesCount ?? 0;
      const leftComments = left.commentsCount ?? 0;
      const rightComments = right.commentsCount ?? 0;
      const leftCreatedAt = new Date(left.createdAt).getTime();
      const rightCreatedAt = new Date(right.createdAt).getTime();

      switch (sortBy) {
        case "new":
          return rightCreatedAt - leftCreatedAt;
        case "liked":
          return rightLikes - leftLikes || rightCreatedAt - leftCreatedAt;
        case "commented":
          return rightComments - leftComments || rightCreatedAt - leftCreatedAt;
        case "trending": {
          const leftScore = leftLikes * 2 + leftComments * 3 + Math.max(0, 1000 - Math.floor((sortReferenceTime - leftCreatedAt) / 3600000));
          const rightScore = rightLikes * 2 + rightComments * 3 + Math.max(0, 1000 - Math.floor((sortReferenceTime - rightCreatedAt) / 3600000));
          return rightScore - leftScore;
        }
        case "best":
        default: {
          const leftScore = leftLikes * 2 + leftComments * 3;
          const rightScore = rightLikes * 2 + rightComments * 3;
          return rightScore - leftScore || rightCreatedAt - leftCreatedAt;
        }
      }
    });

    return sorted;
  }, [items, sortBy, sortReferenceTime]);

  const filteredFeed = useMemo<FilteredFeedResult>(() => {
    const matchesCity = (item: (typeof feedItems)[number]) =>
      !selectedCity || normalizeFeedValue(item.city) === normalizeFeedValue(selectedCity);
    const matchesDistrict = (item: (typeof feedItems)[number]) =>
      !selectedDistrict || normalizeFeedValue(item.district) === normalizeFeedValue(selectedDistrict);

    if (!selectedCity) {
      return {
        fallbackItems: [],
        message: null,
        primaryItems: feedItems,
      };
    }

    const cityItems = feedItems.filter(matchesCity);
    if (selectedDistrict) {
      const districtItems = cityItems.filter(matchesDistrict);
      if (districtItems.length > 0) {
        return {
          fallbackItems: [],
          message: null,
          primaryItems: districtItems,
        };
      }

      if (cityItems.length > 0) {
        return {
          fallbackItems: [],
          message: null,
          primaryItems: cityItems,
        };
      }
    } else if (cityItems.length > 0) {
      return {
        fallbackItems: [],
        message: null,
        primaryItems: cityItems,
      };
    }

    return {
      fallbackItems: feedItems.filter((item) => !matchesCity(item)),
      message: t("community.feed.noCityResults"),
      primaryItems: [],
    };
  }, [feedItems, selectedCity, selectedDistrict, t]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || loading) {
          return;
        }
        void loadMore();
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadMore, loading, items.length]);

  async function onCreatePost() {
    setLocalError(null);
    if (!caption.trim() && imageAttachments.length === 0) return;

    setSubmitting(true);
    try {
      const resolvedPostDistrict = postDistrictOptions.some((option) => option.value === postDistrict)
        ? postDistrict
        : postDistrictOptions[0]?.value ?? DEFAULT_COMMUNITY_LOCATION.district;

      await actions.createPost(caption.trim(), postCity, resolvedPostDistrict, imageAttachments.map((attachment) => attachment.file));
      setCaption("");
      setPostCity(DEFAULT_COMMUNITY_LOCATION.city);
      setPostDistrict(DEFAULT_COMMUNITY_LOCATION.district);
      clearPostImageAttachments();
      setCreatePostOpen(false);
    } catch {
      setLocalError(t("community.error.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onFilesChanged(fileList: FileList | null) {
    if (!fileList) return;
    const selected = Array.from(fileList);
    if (imageAttachments.length + selected.length > MAX_IMAGES) {
      setLocalError(t("community.post.maxImagesError"));
      return;
    }
    const optimized = await Promise.all(
      selected.map(async (file) => {
        let nextFile = file;
        if (ALLOWED_POST_MIME_TYPES.has(file.type)) {
          try {
            nextFile = await optimizeImageFile(file, { maxBytes: MAX_IMAGE_BYTES, maxDimension: MAX_IMAGE_DIMENSION });
          } catch {
            nextFile = file;
          }
        }
        return {
          file: nextFile,
          id: crypto.randomUUID(),
          kind: nextFile.type === "image/gif" ? "gif" : "image",
          previewUrl: URL.createObjectURL(nextFile),
        } satisfies CommentAttachment;
      }),
    );

    setImageAttachments((prev) => [...prev, ...optimized]);
  }

  function removePostImageAttachment(id: string) {
    const target = imageAttachments.find((attachment) => attachment.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    if (activeImageAttachmentId === id) {
      setActiveImageAttachmentId(null);
    }

    setImageAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }

  function clearPostImageAttachments() {
    for (const attachment of imageAttachments) {
      URL.revokeObjectURL(attachment.previewUrl);
    }

    setActiveImageAttachmentId(null);
    setImageAttachments([]);
  }

  return (
    <CommunityPageScaffold onPublishClick={() => setCreatePostOpen(true)}>
      <main className="mx-auto flex w-full flex-1 flex-col py-2">
        <Dialog
          open={createPostOpen}
          onOpenChange={(open) => {
            setCreatePostOpen(open);
            if (!open) {
              setLocalError(null);
              clearPostImageAttachments();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[42rem]">
            <DialogHeader>
              <DialogTitle>{t("community.post.createTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder={t("community.post.captionPlaceholder")}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={postCity} onValueChange={setPostCity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("community.feed.cityPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_LOCATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={postDistrict} onValueChange={setPostDistrict}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("community.feed.districtPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {postDistrictOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => void onFilesChanged(event.target.files)} />
              <p className="text-xs text-muted-foreground">{t("community.post.mediaOptimizingNotice")}</p>
              {imageAttachments.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {imageAttachments.map((attachment) => (
                    <div key={attachment.id} className="space-y-1">
                      <button
                        type="button"
                        className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setActiveImageAttachmentId(attachment.id)}
                      >
                        <Image src={attachment.previewUrl} alt={attachment.file.name} aspect="square" radius="md" />
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => removePostImageAttachment(attachment.id)}
                      >
                        {t("community.post.removeImage")}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreatePostOpen(false)} disabled={submitting}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" onClick={onCreatePost} disabled={submitting || (!caption.trim() && imageAttachments.length === 0)}>
                  {submitting ? t("community.post.publishing") : t("community.post.publish")}
                </Button>
              </div>
            </div>
            <CommentImageEditorDialog
              attachment={activeImageAttachment}
              initialPreset="square"
              onOpenChange={(open) => {
                if (!open) {
                  setActiveImageAttachmentId(null);
                }
              }}
              onSave={(nextAttachment, previousPreviewUrl) => {
                if (!activeImageAttachment) {
                  return;
                }

                setImageAttachments((current) =>
                  current.map((attachment) => (attachment.id === activeImageAttachment.id ? nextAttachment : attachment)),
                );
                URL.revokeObjectURL(previousPreviewUrl);
                setActiveImageAttachmentId(nextAttachment.id);
              }}
              open={Boolean(activeImageAttachment)}
            />
          </DialogContent>
        </Dialog>

        <div className="grid gap-3 lg:grid-cols-3 px-4">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as FeedSortOption)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("community.feed.sortPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="!top-15">
              {FEED_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("community.feed.cityPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="!top-15">
              <SelectItem value={ALL_CITIES_VALUE}>{t("community.feed.allCities")}</SelectItem>
              {COMMUNITY_LOCATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={!selectedCity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("community.feed.districtPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="!top-15">
              <SelectItem value={ALL_DISTRICTS_VALUE}>{t("community.feed.allDistricts")}</SelectItem>
              {selectedCityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredFeed.message ? (
          <div className="rounded-3xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {filteredFeed.message}
          </div>
        ) : null}
        {loading && items.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{t("community.feed.error")}</p> : null}
        {!loading && feedItems.length === 0 ? (
          <div className="pt-6 text-center">
            <p className="font-medium">{t("community.feed.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("community.feed.emptyDescription")}</p>
          </div>
        ) : null}
        {!loading && filteredFeed.primaryItems.length === 0 && filteredFeed.fallbackItems.length > 0 ? (
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{t("community.feed.otherCities")}</p>
            {filteredFeed.fallbackItems.map((item) => (
              <CommunityPostCard key={item.id} item={item} actions={actions} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        ) : null}
        {filteredFeed.primaryItems.map((item) => (
          <CommunityPostCard key={item.id} item={item} actions={actions} isAuthenticated={isAuthenticated} />
        ))}
        {hasNextPage ? <div ref={loadMoreSentinelRef} aria-hidden="true" className="h-1 w-full" /> : null}
        {loading && items.length > 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
      </main>
    </CommunityPageScaffold>
  );
}

function normalizeFeedValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}
