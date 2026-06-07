export type OptimizeImageFileOptions = {
  maxBytes: number;
  maxDimension: number;
  minQuality?: number;
  startingQuality?: number;
  dimensionScaleStep?: number;
};

const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_MIN_QUALITY = 0.58;
const DEFAULT_STARTING_QUALITY = 0.92;
const DEFAULT_DIMENSION_SCALE_STEP = 0.85;

export async function optimizeImageFile(file: File, options: OptimizeImageFileOptions): Promise<File> {
  if (file.size <= 0 || !SUPPORTED_MIME_TYPES.has(file.type) || file.type === "image/gif") {
    return file;
  }

  if (file.size <= options.maxBytes) {
    return file;
  }

  const minQuality = options.minQuality ?? DEFAULT_MIN_QUALITY;
  const startingQuality = options.startingQuality ?? DEFAULT_STARTING_QUALITY;
  const dimensionScaleStep = options.dimensionScaleStep ?? DEFAULT_DIMENSION_SCALE_STEP;
  const outputMimeType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  const extension = outputMimeType === "image/jpeg" ? "jpg" : "webp";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const image = await loadImage(file);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  let width = naturalWidth;
  let height = naturalHeight;

  if (width > options.maxDimension || height > options.maxDimension) {
    const scale = Math.min(options.maxDimension / width, options.maxDimension / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  let quality = startingQuality;
  let lastBlob: Blob | null = null;

  for (let pass = 0; pass < 8; pass += 1) {
    lastBlob = await renderImageToBlob(image, width, height, outputMimeType, quality);
    if (lastBlob.size <= options.maxBytes) {
      return toFile(lastBlob, baseName, extension, file.lastModified);
    }

    if (quality > minQuality) {
      quality = Math.max(minQuality, Number((quality - 0.08).toFixed(2)));
      continue;
    }

    if (width <= 256 && height <= 256) {
      break;
    }

    width = Math.max(1, Math.round(width * dimensionScaleStep));
    height = Math.max(1, Math.round(height * dimensionScaleStep));
    quality = startingQuality;
  }

  if (!lastBlob) {
    return file;
  }

  if (lastBlob.size > options.maxBytes) {
    throw new Error("image_optimization_failed");
  }

  return toFile(lastBlob, baseName, extension, file.lastModified);
}

function toFile(blob: Blob, baseName: string, extension: string, lastModified: number) {
  return new File([blob], `${baseName}.${extension}`, { type: blob.type || (extension === "jpg" ? "image/jpeg" : "image/webp"), lastModified });
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new globalThis.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image_load_failed"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderImageToBlob(
  image: HTMLImageElement,
  width: number,
  height: number,
  mimeType: string,
  quality: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("image_canvas_unavailable");
  }

  context.drawImage(image, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("image_blob_export_failed"));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });
}
