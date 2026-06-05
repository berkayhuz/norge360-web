import { cn } from "@workspace/ui/lib/utils"

import type { HTMLAttributes } from "react"

type HeadingLevel = 1 | 2 | 3 | 4 | 5

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: HeadingLevel
}

const styles: Record<HeadingLevel, string> = {
  1: "scroll-m-20 text-4xl font-extrabold tracking-tight text-balance lg:text-5xl",
  2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
  3: "scroll-m-20 text-2xl font-semibold tracking-tight",
  4: "scroll-m-20 text-xl font-semibold tracking-tight",
  5: "scroll-m-20 text-lg tracking-tight",
}

const components = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
} as const

export function Heading({ level = 1, className, ...props }: HeadingProps) {
  const Comp = components[level]

  return <Comp className={cn(styles[level], className)} {...props} />
}