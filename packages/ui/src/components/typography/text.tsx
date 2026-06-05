import { cn } from "@workspace/ui/lib/utils";

import type { HTMLAttributes } from "react";

export function Text({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("leading-7", className)} {...props} />;
}