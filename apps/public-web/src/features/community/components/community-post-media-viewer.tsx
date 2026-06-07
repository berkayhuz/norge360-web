"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@workspace/ui/components/primitives/button";
import { Image } from "@workspace/ui/components/primitives/image";

import type { CommunityPostMedia } from "@/features/community/lib/types";
import { cn } from "@workspace/ui/lib/utils";

export function CommunityPostMediaViewer({
  media,
  alt,
}: {
  media: CommunityPostMedia[];
  alt: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationSnapRestoreRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startScrollLeft: number;
    targetScrollLeft: number;
    rafId: number | null;
    dragged: boolean;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    targetScrollLeft: 0,
    rafId: null,
    dragged: false,
  });

  if (media.length === 0) {
    return null;
  }

  const showControls = media.length > 1;

  useEffect(() => {
    if (activeIndex > media.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, media.length]);

  function syncActiveIndex() {
    const track = trackRef.current;
    if (!track) return;

    const width = track.clientWidth;
    if (width <= 0) return;

    const nextIndex = Math.round(track.scrollLeft / width);
    setActiveIndex(Math.max(0, Math.min(media.length - 1, nextIndex)));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!track) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: track.scrollLeft,
      targetScrollLeft: track.scrollLeft,
      rafId: null,
      dragged: false,
    };

    track.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    const dragState = dragStateRef.current;
    if (!track || !dragState.active || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.dragged && Math.hypot(deltaX, deltaY) > 8) {
      dragState.dragged = true;
    }

    if (!dragState.dragged) {
      return;
    }

    event.preventDefault();
    dragState.targetScrollLeft = dragState.startScrollLeft - deltaX;

    if (dragState.rafId !== null) {
      return;
    }

    dragState.rafId = window.requestAnimationFrame(() => {
      dragState.rafId = null;
      const currentTrack = trackRef.current;
      if (!currentTrack || !dragState.active) {
        return;
      }

      currentTrack.scrollLeft = dragState.targetScrollLeft;
    });
  }

  function clearDragState() {
    const wasDragged = dragStateRef.current.dragged;
    if (dragStateRef.current.rafId !== null) {
      window.cancelAnimationFrame(dragStateRef.current.rafId);
    }
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
    dragStateRef.current.startX = 0;
    dragStateRef.current.startY = 0;
    dragStateRef.current.startScrollLeft = 0;
    dragStateRef.current.targetScrollLeft = 0;
    dragStateRef.current.rafId = null;

    if (wasDragged) {
      window.setTimeout(() => {
        dragStateRef.current.dragged = false;
      }, 0);
    } else {
      dragStateRef.current.dragged = false;
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (dragState.pointerId === event.pointerId) {
      if (dragState.dragged) {
        const track = trackRef.current;
        if (track) {
          const width = track.clientWidth;
          if (width > 0) {
            const nearestIndex = Math.round(track.scrollLeft / width);
            scrollToIndex(nearestIndex);
          }
        }
      }

      clearDragState();
    }
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (dragState.pointerId === event.pointerId) {
      clearDragState();
    }
  }

  function cancelAnimation() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (animationSnapRestoreRef.current !== null) {
      window.clearTimeout(animationSnapRestoreRef.current);
      animationSnapRestoreRef.current = null;
    }
  }

  function scrollToIndex(index: number, animated = true) {
    const track = trackRef.current;
    if (!track) return;

    const targetIndex = Math.max(0, Math.min(media.length - 1, index));
    const width = track.clientWidth;
    const targetLeft = targetIndex * width;

    cancelAnimation();

    if (!animated) {
      track.scrollTo({ left: targetLeft, behavior: "auto" });
      return;
    }

    const startLeft = track.scrollLeft;
    const delta = targetLeft - startLeft;
    const duration = 420;
    const startTime = performance.now();
    const previousSnapType = track.style.scrollSnapType;

    track.style.scrollSnapType = "none";

    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      track.scrollLeft = startLeft + delta * easeOutCubic(progress);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      track.scrollLeft = targetLeft;
      animationSnapRestoreRef.current = window.setTimeout(() => {
        track.style.scrollSnapType = previousSnapType;
        animationSnapRestoreRef.current = null;
      }, 16);
      animationFrameRef.current = null;
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
  }

  function scrollByStep(direction: -1 | 1) {
    scrollToIndex(activeIndex + direction, true);
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth touch-pan-x select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          onScroll={syncActiveIndex}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {media.map((item, index) => (
            <button
              key={item.id ?? `${item.url}-${index}`}
              type="button"
              className="w-full shrink-0 snap-start overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={(event) => {
                if (dragStateRef.current.dragged) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }

                setActiveIndex(index);
              }}
            >
              <Image
                src={item.url}
                alt={item.altText ?? alt}
                aspect="video"
                radius="xl"
              />
            </button>
          ))}
        </div>

        {showControls ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-1 text-foreground shadow-md backdrop-blur transition hover:bg-background"
              onClick={() => scrollByStep(-1)}
              disabled={activeIndex === 0}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-1 text-foreground shadow-md backdrop-blur transition hover:bg-background"
              onClick={() => scrollByStep(1)}
              disabled={activeIndex >= media.length - 1}
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
              <div className="flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur-sm">
                {media.map((item, index) => (
                  <span
                    key={item.id ?? `${item.url}-${index}-dot`}
                    className={index === activeIndex ? "h-1.5 w-4 rounded-full bg-white" : "h-1.5 w-1.5 rounded-full bg-white/60"}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
