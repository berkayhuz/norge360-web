"use client";

import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
type PostActionsProps = React.ComponentProps<"div"> & {
    leading?: React.ReactNode
    trailing?: React.ReactNode
}

function PostActions({ className, leading, trailing, children, ...props }: PostActionsProps) {
    return (
        <div
            data-slot="post-actions"
            className={cn("flex items-center justify-between gap-3", className)}
            {...props}
        >
            <div className="flex min-w-0 flex-wrap items-center gap-4">{leading ?? children}</div>
            {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </div>
    )
}

export { PostActions }
