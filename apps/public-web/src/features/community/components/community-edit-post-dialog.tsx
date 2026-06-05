"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@workspace/ui/components/primitives/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/overlay/dialog";
import { Input } from "@workspace/ui/components/forms/input";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/forms/native-select";
import { Image } from "@workspace/ui/components/primitives/image";

import type { CommunityFeedActions } from "@/features/community/lib/hooks";
import type { CommunityFeedItem } from "@/features/community/lib/types";
import {
  COMMUNITY_LOCATION_OPTIONS,
  DEFAULT_COMMUNITY_LOCATION,
  getCommunityDistrictOptions,
  normalizeCommunityCityValue,
  normalizeCommunityDistrictValue,
} from "@/features/community/lib/location-options";

const MAX_IMAGES = 8;

export function CommunityEditPostDialog({
  item,
  actions,
  open,
  onOpenChange,
  trigger,
}: {
  item: CommunityFeedItem;
  actions: CommunityFeedActions;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const t = useTranslations("public-web");
  const [caption, setCaption] = useState(item.caption ?? "");
  const [city, setCity] = useState(normalizeCommunityCityValue(item.city));
  const [district, setDistrict] = useState(normalizeCommunityDistrictValue(item.city, item.district));
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removeMediaIds, setRemoveMediaIds] = useState<string[]>([]);

  const existingMedia = useMemo(() => item.media.filter((media) => !removeMediaIds.includes(media.id ?? "")), [item.media, removeMediaIds]);
  const districtOptions = useMemo(() => getCommunityDistrictOptions(city), [city]);

  useEffect(() => {
    if (!districtOptions.some((option) => option.value === district)) {
      setDistrict(districtOptions[0]?.value ?? DEFAULT_COMMUNITY_LOCATION.district);
    }
  }, [district, districtOptions]);

  async function onSave() {
    const mediaOrder = existingMedia.map((x) => x.id ?? "").filter(Boolean);
    await actions.updatePost(item.id, {
      caption,
      city,
      district,
      existingMediaIds: mediaOrder,
      mediaFiles: newFiles,
      mediaOrder,
      removeMediaIds,
    });
    onOpenChange?.(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("community.post.editTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea value={caption} onChange={(event) => setCaption(event.target.value)} />
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
          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (existingMedia.length + files.length > MAX_IMAGES) return;
              setNewFiles(files);
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            {existingMedia.map((media) => (
              <div key={media.id ?? media.url} className="space-y-1">
                <Image src={media.url} alt={t("community.post.mediaAlt")} aspect="square" />
                {media.id ? <Button size="sm" variant="outline" onClick={() => setRemoveMediaIds((prev) => [...prev, media.id!])}>{t("community.post.removeImage")}</Button> : null}
              </div>
            ))}
          </div>
          <Button onClick={() => void onSave()}>{t("community.post.saveChanges")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
