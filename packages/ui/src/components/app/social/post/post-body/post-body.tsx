"use client";

import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"

type PostBodyProps = React.ComponentProps<"div"> & {
    media?: React.ReactNode
}

function PostBody({ className, media, children, ...props }: PostBodyProps) {
    return (
        <div
            data-slot="post-body"
            className={cn("space-y-3", className)}
            {...props}
        >
            {children}
            {media}
        </div>
    )
}

export { PostBody }
