"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@workspace/ui/components/primitives/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/overlay/dialog";
import { Input } from "@workspace/ui/components/forms/input";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/forms/native-select";
import { Image } from "@workspace/ui/components/primitives/image";

import {
  CommentImageEditorDialog,
  type CommentAttachment,
} from "@/features/community/components/community-comment-image-editor-dialog";
import type { CommunityFeedActions } from "@/features/community/lib/hooks";
import type { CommunityFeedItem } from "@/features/community/lib/types";
import {
  COMMUNITY_LOCATION_OPTIONS,
  DEFAULT_COMMUNITY_LOCATION,
  getCommunityDistrictOptions,
  normalizeCommunityCityValue,
  normalizeCommunityDistrictValue,
} from "@/features/community/lib/location-options";
import { optimizeImageFile } from "@/lib/image-optimize";

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const ALLOWED_POST_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const [newAttachments, setNewAttachments] = useState<CommentAttachment[]>([]);
  const newAttachmentsRef = useRef<CommentAttachment[]>([]);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const [removeMediaIds, setRemoveMediaIds] = useState<string[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const existingMedia = useMemo(() => item.media.filter((media) => !removeMediaIds.includes(media.id ?? "")), [item.media, removeMediaIds]);
  const districtOptions = useMemo(() => getCommunityDistrictOptions(city), [city]);
  const activeAttachment = useMemo(
    () => newAttachments.find((attachment) => attachment.id === activeAttachmentId) ?? null,
    [activeAttachmentId, newAttachments],
  );

  useEffect(() => {
    newAttachmentsRef.current = newAttachments;
  }, [newAttachments]);

  useEffect(() => {
    return () => {
      for (const attachment of newAttachmentsRef.current) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, []);

  const resolvedDistrict = districtOptions.some((option) => option.value === district)
    ? district
    : districtOptions[0]?.value ?? DEFAULT_COMMUNITY_LOCATION.district;

  async function onSave() {
    const mediaOrder = existingMedia.map((x) => x.id ?? "").filter(Boolean);
    setMediaError(null);
    await actions.updatePost(item.id, {
      caption,
      city,
      district: resolvedDistrict,
      existingMediaIds: mediaOrder,
      mediaFiles: newAttachments.map((attachment) => attachment.file),
      mediaOrder,
      removeMediaIds,
    });
    clearNewAttachments();
    onOpenChange?.(false);
  }

  async function addNewFiles(files: File[]) {
    if (existingMedia.length + newAttachments.length + files.length > MAX_IMAGES) {
      setMediaError(t("community.post.maxImagesError"));
      return;
    }

    const optimized = await Promise.all(
      files.map(async (file) => {
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

    setNewAttachments((current) => [...current, ...optimized]);
    setMediaError(null);
  }

  function removeNewAttachment(id: string) {
    const target = newAttachments.find((attachment) => attachment.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    if (activeAttachmentId === id) {
      setActiveAttachmentId(null);
    }

    setNewAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  function clearNewAttachments() {
    for (const attachment of newAttachments) {
      URL.revokeObjectURL(attachment.previewUrl);
    }

    setActiveAttachmentId(null);
    setNewAttachments([]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          clearNewAttachments();
          setRemoveMediaIds([]);
        }

        onOpenChange?.(nextOpen);
      }}
    >
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
            <NativeSelect value={resolvedDistrict} onChange={(event) => setDistrict(event.target.value)}>
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
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              void addNewFiles(files);
              event.target.value = "";
            }}
          />
          {mediaError ? <p className="text-xs text-destructive">{mediaError}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            {existingMedia.map((media) => (
              <div key={media.id ?? media.url} className="space-y-1">
                <Image src={media.url} alt={t("community.post.mediaAlt")} aspect="square" />
                {media.id ? <Button size="sm" variant="outline" onClick={() => setRemoveMediaIds((prev) => [...prev, media.id!])}>{t("community.post.removeImage")}</Button> : null}
              </div>
            ))}
            {newAttachments.map((attachment) => (
              <div key={attachment.id} className="space-y-1">
                <button
                  type="button"
                  className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setActiveAttachmentId(attachment.id)}
                >
                  <Image src={attachment.previewUrl} alt={attachment.file.name} aspect="square" />
                </button>
                <Button size="sm" variant="outline" onClick={() => removeNewAttachment(attachment.id)}>
                  {t("community.post.removeImage")}
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={() => void onSave()}>{t("community.post.saveChanges")}</Button>
        </div>
        <CommentImageEditorDialog
          attachment={activeAttachment}
          initialPreset="square"
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setActiveAttachmentId(null);
            }
          }}
          onSave={(nextAttachment, previousPreviewUrl) => {
            if (!activeAttachment) {
              return;
            }

            setNewAttachments((current) =>
              current.map((attachment) => (attachment.id === activeAttachment.id ? nextAttachment : attachment)),
            );
            URL.revokeObjectURL(previousPreviewUrl);
            setActiveAttachmentId(nextAttachment.id);
          }}
          open={Boolean(activeAttachment)}
        />
      </DialogContent>
    </Dialog>
  );
}
