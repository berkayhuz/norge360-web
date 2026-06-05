import { cn } from "@workspace/ui/lib/utils";

import type { HTMLAttributes } from "react";

export function Prose({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("prose prose-neutral dark:prose-invert max-w-none", className)} {...props} />
  );
}
