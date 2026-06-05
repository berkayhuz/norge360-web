import { cn } from "@workspace/ui/lib/utils";

import type { HTMLAttributes } from "react";

export function Muted({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-muted-foreground text-sm", className)} {...props} />;
}
