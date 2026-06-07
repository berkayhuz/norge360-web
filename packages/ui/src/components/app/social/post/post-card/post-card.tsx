"use client";

import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"

type PostCardProps = React.ComponentProps<"article"> & {
    header?: React.ReactNode
    body?: React.ReactNode
    actions?: React.ReactNode
}

function PostCard({ className, header, body, actions, children, ...props }: PostCardProps) {
    return (
        <article
            data-slot="post-card"
            className={cn(
                "space-y-2 p-4 border border-transparent bg-transparent",
                className,
            )}
            {...props}
        >
            <div className="space-y-4">
                {header}
                {body}
            </div>
            {actions}
            {children}
        </article>
    )
}

export { PostCard }
