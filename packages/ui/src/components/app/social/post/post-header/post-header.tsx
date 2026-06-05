"use client";

import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
type PostHeaderProps = React.ComponentProps<"div"> & {
    avatar?: React.ReactNode
    menu?: React.ReactNode
}

function PostHeader({ className, avatar, menu, children, ...props }: PostHeaderProps) {
    return (
        <div
            data-slot="post-header"
            className={cn("flex items-start justify-between gap-3", className)}
            {...props}
        >
            <div className="min-w-0 flex-1">{children ?? avatar}</div>
            {menu ? <div className="shrink-0">{menu}</div> : null}
        </div>
    )
}

export { PostHeader }
