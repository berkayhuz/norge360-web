"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const imageFrameVariants = cva(
  "relative isolate overflow-hidden bg-muted/40 ring-1 ring-inset ring-border/60",
  {
    variants: {
      aspect: {
        auto: "",
        square: "aspect-square",
        video: "aspect-video",

        // Dinamik aspectRatio style ile verilecek
        portrait: "",
        landscape: "",
      },
      radius: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
      border: {
        default: "",
        none: "ring-0",
      },
      shadow: {
        none: "",
        sm: "shadow-sm shadow-black/5 dark:shadow-black/20",
        md: "shadow-md shadow-black/10 dark:shadow-black/30",
      },
    },
    defaultVariants: {
      aspect: "auto",
      radius: "md",
      border: "default",
      shadow: "none",
    },
  }
)

const imageVariants = cva("block h-full w-full select-none", {
  variants: {
    fit: {
      cover: "object-cover",
      contain: "object-contain",
      fill: "object-fill",
      none: "object-none",
      "scale-down": "object-scale-down",
    },
  },
  defaultVariants: {
    fit: "cover",
  },
})

type ImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "className" | "onError" | "src"
> &
  VariantProps<typeof imageFrameVariants> &
  VariantProps<typeof imageVariants> & {
    alt: string
    src: string
    className?: string
    wrapperClassName?: string
    wrapperStyle?: React.CSSProperties
    fallbackSrc?: string
    onError?: React.ReactEventHandler<HTMLImageElement>
  }

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  function Image(
    {
      alt,
      src,
      fallbackSrc,
      className,
      wrapperClassName,
      wrapperStyle,
      aspect = "auto",
      radius = "md",
      border = "default",
      shadow = "none",
      fit = "cover",
      onError,
      onLoad,
      ...props
    },
    ref
  ) {
    const [hasErrored, setHasErrored] = React.useState(false)
    const [imageAspectRatio, setImageAspectRatio] = React.useState<
      string | undefined
    >(undefined)

    React.useEffect(() => {
      setHasErrored(false)
      setImageAspectRatio(undefined)
    }, [src, fallbackSrc])

    const resolvedSrc = hasErrored && fallbackSrc ? fallbackSrc : src

    const fixedAspectRatio =
      aspect === "portrait"
        ? "4 / 5"
        : aspect === "landscape"
          ? "5 / 4"
          : undefined

    const resolvedAspectRatio =
      aspect === "auto" ? imageAspectRatio : fixedAspectRatio

    return (
      <div
        data-slot="image"
        data-aspect={aspect}
        data-radius={radius}
        data-border={border}
        data-shadow={shadow}
        className={cn(
          imageFrameVariants({ aspect, radius, border, shadow }),
          wrapperClassName
        )}
        style={{
          aspectRatio: resolvedAspectRatio,
          ...wrapperStyle,
        }}
      >
        <img
          ref={ref}
          alt={alt}
          src={resolvedSrc}
          onLoad={(event) => {
            const img = event.currentTarget

            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setImageAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`)
            }

            onLoad?.(event)
          }}
          onError={(event) => {
            if (fallbackSrc && !hasErrored) {
              setHasErrored(true)
            }

            onError?.(event)
          }}
          className={cn(imageVariants({ fit }), className)}
          {...props}
        />
      </div>
    )
  }
)

Image.displayName = "Image"

export { Image }
export type { ImageProps }