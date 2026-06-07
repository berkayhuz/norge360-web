"use client";

import type { CSSProperties, Dispatch, PointerEvent, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Crop, Maximize2, Move, PencilLine, Search } from "lucide-react";

import { Button } from "@workspace/ui/components/primitives/button";
import { Slider } from "@workspace/ui/components/primitives/slider";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { optimizeImageFile } from "@/lib/image-optimize";

export type CommentAttachmentKind = "image" | "gif";
export type CommentAttachment = {
  id: string;
  file: File;
  previewUrl: string;
  kind: CommentAttachmentKind;
};

export type CropPreset = "circle" | "square" | "portrait" | "landscape";

const CROP_PRESETS: Array<{
  key: CropPreset;
  labelKey: "community.imageEditor.presets.circle" | "community.imageEditor.presets.square" | "community.imageEditor.presets.portrait" | "community.imageEditor.presets.landscape";
  aspect: number;
  circular: boolean;
}> = [
    { key: "circle", labelKey: "community.imageEditor.presets.circle", aspect: 1, circular: true },
    { key: "square", labelKey: "community.imageEditor.presets.square", aspect: 1, circular: false },
    { key: "portrait", labelKey: "community.imageEditor.presets.portrait", aspect: 4 / 5, circular: false },
    { key: "landscape", labelKey: "community.imageEditor.presets.landscape", aspect: 16 / 9, circular: false },
  ];

export function CommentImageEditorDialog({
  attachment,
  open,
  onOpenChange,
  onSave,
  initialPreset = "circle",
}: {
  attachment: CommentAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (nextAttachment: CommentAttachment, previousPreviewUrl: string) => void | Promise<void>;
  initialPreset?: CropPreset;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");

  if (!attachment) {
    return null;
  }

  const canEdit = attachment.kind !== "gif" && attachment.file.type !== "image/gif";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setMode("view");
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-[56rem]">
        <DialogTitle className="sr-only">Image editor</DialogTitle>
        <DialogDescription className="sr-only">
          Preview, crop and save the selected image.
        </DialogDescription>

        {mode === "view" ? (
          <MediaPreview attachment={attachment} canEdit={canEdit} onEdit={() => setMode("edit")} />
        ) : (
          <ImageCropEditor
            key={`${attachment.id}-${initialPreset}`}
            attachment={attachment}
            initialPreset={initialPreset}
            onCancel={() => setMode("view")}
            onSave={async (nextAttachment, previousPreviewUrl) => {
              await onSave(nextAttachment, previousPreviewUrl);
              setMode("view");
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MediaPreview({
  attachment,
  canEdit,
  onEdit,
}: {
  attachment: CommentAttachment;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations("public-web");

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-border/60 bg-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element -- The editor needs direct access to the selected object URL. */}
      <img src={attachment.previewUrl} alt={attachment.file.name} className="max-h-[70vh] w-full object-contain" />
      <Button type="button" variant="secondary" onClick={onEdit} disabled={!canEdit} className="group-hover:opacity-100 lg:opacity-0 absolute bottom-2 right-2">
        <PencilLine className="size-4" />
        {t("community.imageEditor.edit")}
      </Button>
    </div>
  );
}

function ImageCropEditor({
  attachment,
  initialPreset,
  onCancel,
  onSave,
}: {
  attachment: CommentAttachment;
  initialPreset: CropPreset;
  onCancel: () => void;
  onSave: (nextAttachment: CommentAttachment, previousPreviewUrl: string) => void | Promise<void>;
}) {
  const t = useTranslations("public-web");
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [presetKey, setPresetKey] = useState<CropPreset>(attachment.kind === "gif" ? "square" : initialPreset);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const preset = useMemo(() => CROP_PRESETS.find((item) => item.key === presetKey) ?? CROP_PRESETS[0], [presetKey]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const updateFrameSize = () => {
      const rect = frame.getBoundingClientRect();
      setFrameSize({ width: rect.width, height: rect.height });
    };

    const observer = new ResizeObserver(updateFrameSize);

    updateFrameSize();
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  function clampOffset(nextOffset: { x: number; y: number }) {
    if (!frameSize || !imageSize) {
      return nextOffset;
    }

    const displayScale = getDisplayScale(frameSize.width, frameSize.height, imageSize.width, imageSize.height, zoom);
    const displayWidth = imageSize.width * displayScale;
    const displayHeight = imageSize.height * displayScale;
    const limitX = Math.max(0, (displayWidth - frameSize.width) / 2);
    const limitY = Math.max(0, (displayHeight - frameSize.height) / 2);

    return {
      x: clamp(nextOffset.x, -limitX, limitX),
      y: clamp(nextOffset.y, -limitY, limitY),
    };
  }

  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [presetKey]);

  useEffect(() => {
    setOffset((current) => {
      const nextOffset = clampOffset(current);
      if (nextOffset.x === current.x && nextOffset.y === current.y) {
        return current;
      }

      return nextOffset;
    });
  }, [frameSize, imageSize, zoom]);

  const frameShapeClass = preset.circular ? "rounded-full" : "rounded-[28px]";

  async function handleSave() {
    if (!imageSize || !frameSize || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const nextAttachment = await cropAttachment(attachment, frameSize, imageSize, preset.circular, zoom, offset);
      await onSave(nextAttachment, attachment.previewUrl);
    } finally {
      setIsSaving(false);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!imageSize) {
      return;
    }

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    dragStateRef.current = { startX: event.clientX, startY: event.clientY, offsetX: offset.x, offsetY: offset.y };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || !frameSize || !imageSize) {
      return;
    }

    const displayScale = getDisplayScale(frameSize.width, frameSize.height, imageSize.width, imageSize.height, zoom);
    const displayWidth = imageSize.width * displayScale;
    const displayHeight = imageSize.height * displayScale;
    const limitX = Math.max(0, (displayWidth - frameSize.width) / 2);
    const limitY = Math.max(0, (displayHeight - frameSize.height) / 2);

    setOffset({
      x: clamp(dragState.offsetX + (event.clientX - dragState.startX), -limitX, limitX),
      y: clamp(dragState.offsetY + (event.clientY - dragState.startY), -limitY, limitY),
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current) {
      dragStateRef.current = null;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="grid gap-0 border-t border-border/60 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
      <div className="space-y-4 px-5 py-5">
        <div
          ref={frameRef}
          className={cn(
            "relative mx-auto w-full max-w-[42rem] overflow-hidden border-2 border-dashed border-primary/40 bg-black/95",
            preset.circular ? "aspect-square" : preset.aspect < 1 ? "aspect-[4/5]" : "aspect-video",
            frameShapeClass,
            isDragging && "cursor-grabbing",
            !isDragging && "cursor-grab",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <CropImage
            attachment={attachment}
            imageSize={imageSize}
            frameSize={frameSize}
            onImageSize={setImageSize}
            zoom={zoom}
            offset={offset}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 border-[10px] border-transparent",
              preset.circular ? "rounded-full" : "rounded-[inherit]",
            )}
          >
            <div className={cn("absolute inset-0 border border-white/20", preset.circular ? "rounded-full" : "rounded-[inherit]")} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Move className="size-3.5" />
          {t("community.imageEditor.dragHint")}
        </div>
      </div>

      <div className="space-y-5 border-t border-border/60 px-5 py-5 lg:border-l lg:border-t-0">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t("community.imageEditor.cropShape")}</p>
          <div className="grid grid-cols-2 gap-2">
            {CROP_PRESETS.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={presetKey === item.key ? "default" : "outline"}
                className="justify-start"
                onClick={() => {
                  setPresetKey(item.key);
                }}
              >
                {presetKey === item.key ? <Check className="size-4" /> : <Maximize2 className="size-4" />}
                {t(item.labelKey)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{t("community.imageEditor.zoom")}</p>
            <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0] ?? 1)}
            />
          </div>
        </div>

        {attachment.kind === "gif" ? (
          <p className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("community.imageEditor.gifDisabled")}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            {t("community.imageEditor.cancel")}
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            <Crop className="size-4" />
            {isSaving ? t("community.imageEditor.saving") : t("community.imageEditor.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CropImage({
  attachment,
  imageSize,
  frameSize,
  onImageSize,
  zoom,
  offset,
}: {
  attachment: CommentAttachment;
  imageSize: { width: number; height: number } | null;
  frameSize: { width: number; height: number } | null;
  onImageSize: Dispatch<SetStateAction<{ width: number; height: number } | null>>;
  zoom: number;
  offset: { x: number; y: number };
}) {
  const style = useMemo<CSSProperties | undefined>(() => getImageStyle(imageSize, frameSize, zoom, offset), [imageSize, frameSize, zoom, offset]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- The cropper needs natural dimensions and precise transforms.
    <img
      src={attachment.previewUrl}
      alt={attachment.file.name}
      draggable={false}
      className="absolute left-1/2 top-1/2 max-w-none select-none"
      style={style}
      onLoad={(event) => {
        const target = event.currentTarget;
        onImageSize({
          width: target.naturalWidth,
          height: target.naturalHeight,
        });
      }}
    />
  );
}

function getImageStyle(
  imageSize: { width: number; height: number } | null,
  frameSize: { width: number; height: number } | null,
  zoom: number,
  offset: { x: number; y: number },
): CSSProperties | undefined {
  if (!imageSize || !frameSize) {
    return {
      transform: "translate(-50%, -50%)",
    };
  }

  const displayScale = getDisplayScale(frameSize.width, frameSize.height, imageSize.width, imageSize.height, zoom);

  return {
    width: `${Math.round(imageSize.width * displayScale)}px`,
    height: `${Math.round(imageSize.height * displayScale)}px`,
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
    transformOrigin: "center center",
  };
}

function getDisplayScale(
  frameWidth: number,
  frameHeight: number,
  imageWidth: number,
  imageHeight: number,
  zoom: number,
) {
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * zoom;
}

async function cropAttachment(
  attachment: CommentAttachment,
  frameSize: { width: number; height: number },
  imageSize: { width: number; height: number },
  circular: boolean,
  zoom: number,
  offset: { x: number; y: number },
) {
  const displayScale = getDisplayScale(frameSize.width, frameSize.height, imageSize.width, imageSize.height, zoom);
  const displayedWidth = imageSize.width * displayScale;
  const displayedHeight = imageSize.height * displayScale;
  const imageLeft = (frameSize.width - displayedWidth) / 2 + offset.x;
  const imageTop = (frameSize.height - displayedHeight) / 2 + offset.y;

  const cropWidth = frameSize.width / displayScale;
  const cropHeight = frameSize.height / displayScale;
  const sourceX = clamp((-imageLeft) / displayScale, 0, imageSize.width - cropWidth);
  const sourceY = clamp((-imageTop) / displayScale, 0, imageSize.height - cropHeight);

  const sourceImage = await loadImage(attachment.previewUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropWidth));
  canvas.height = Math.max(1, Math.round(cropHeight));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create crop canvas");
  }

  if (circular) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  ctx.drawImage(
    sourceImage,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  if (circular) {
    ctx.restore();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) {
        reject(new Error("Unable to export cropped image"));
        return;
      }

      resolve(value);
    }, attachment.file.type === "image/png" ? "image/png" : "image/jpeg", 0.95);
  });

  const extension = attachment.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExtension = circular ? "png" : extension;
  const nextFile = new File([blob], `${attachment.file.name.replace(/\.[^.]+$/, "")}-cropped.${safeExtension}`, {
    type: blob.type,
  });
  let optimizedFile = nextFile;
  try {
    optimizedFile = await optimizeImageFile(nextFile, {
      maxBytes: 1 * 1024 * 1024,
      maxDimension: 1920,
    });
  } catch {
    optimizedFile = nextFile;
  }
  const previewUrl = URL.createObjectURL(optimizedFile);

  return {
    ...attachment,
    file: optimizedFile,
    previewUrl,
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new globalThis.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
