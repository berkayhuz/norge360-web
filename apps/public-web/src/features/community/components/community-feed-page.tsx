"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Input } from "@workspace/ui/components/forms/input";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/forms/native-select";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { Image } from "@workspace/ui/components/primitives/image";
import { Button } from "@workspace/ui/components/primitives/button";
import { CommunityPostCard } from "@/features/community/components/community-post-card";
import { CommunityPopularUsersWidget } from "@/features/discovery/components/community-popular-users-widget";
import { useCommunityFeed } from "@/features/community/lib/hooks";
import { COMMUNITY_LOCATION_OPTIONS, DEFAULT_COMMUNITY_LOCATION, getCommunityDistrictOptions } from "@/features/community/lib/location-options";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";

const MAX_IMAGES = 8;

export function CommunityFeedPage() {
  const t = useTranslations("public-web");
  const { actions, error, hasNextPage, items, loadInitial, loadMore, loading } = useCommunityFeed();
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [caption, setCaption] = useState("");
  const [city, setCity] = useState(DEFAULT_COMMUNITY_LOCATION.city);
  const [district, setDistrict] = useState(DEFAULT_COMMUNITY_LOCATION.district);
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const districtOptions = getCommunityDistrictOptions(city);

  useEffect(() => {
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
    if (!districtOptions.some((option) => option.value === district)) {
      setDistrict(districtOptions[0]?.value ?? DEFAULT_COMMUNITY_LOCATION.district);
    }
  }, [district, districtOptions]);

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
    if (!caption.trim() && images.length === 0) return;

    setSubmitting(true);
    try {
      await actions.createPost(caption.trim(), city, district, images);
      setCaption("");
      setCity(DEFAULT_COMMUNITY_LOCATION.city);
      setDistrict(DEFAULT_COMMUNITY_LOCATION.district);
      setImages([]);
    } catch {
      setLocalError(t("community.error.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  function onFilesChanged(fileList: FileList | null) {
    if (!fileList) return;
    const selected = Array.from(fileList);
    if (images.length + selected.length > MAX_IMAGES) {
      setLocalError(t("community.post.maxImagesError"));
      return;
    }
    setImages((prev) => [...prev, ...selected]);
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="hidden lg:block h-screen w-full col-span-1">
        
      </div>
      <div className="w-full block relative col-span-4 md:col-span-2">
        <main className="mx-auto flex w-full flex-1 flex-col">
          {isAuthenticated ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("community.post.createTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder={t("community.post.captionPlaceholder")} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <NativeSelect value={city} onChange={(event) => setCity(event.target.value)}>
                    {COMMUNITY_LOCATION_OPTIONS.map((option) => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <NativeSelect value={district} onChange={(event) => setDistrict(event.target.value)}>
                    {districtOptions.map((option) => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <Input type="file" multiple accept="image/*" onChange={(event) => onFilesChanged(event.target.files)} />
                <p className="text-xs text-muted-foreground">{t("community.post.mediaOptimizingNotice")}</p>
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {images.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="space-y-1">
                        <Image src={URL.createObjectURL(file)} alt={file.name} aspect="square" radius="md" />
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}>{t("community.post.removeImage")}</Button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
                <Button type="button" onClick={onCreatePost} disabled={submitting || (!caption.trim() && images.length === 0)}>
                  {submitting ? t("community.post.publishing") : t("community.post.publish")}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{t("community.feed.error")}</p> : null}
          {!loading && items.length === 0 ? (
            <div>
              <p className="font-medium">{t("community.feed.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("community.feed.emptyDescription")}</p>
            </div>
          ) : null}
          {items.map((item) => (
            <CommunityPostCard key={item.id} item={item} actions={actions} />
          ))}
          {hasNextPage ? <div ref={loadMoreSentinelRef} aria-hidden="true" className="h-1 w-full" /> : null}
          {loading && items.length > 0 ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : null}
        </main>
      </div>
      <div className="hidden lg:block h-screen w-full col-span-1">
          <CommunityPopularUsersWidget />
      </div>
    </div>
  );
}
