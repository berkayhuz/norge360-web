"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

type VerifiedIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number
}

function VerifiedIcon({
  className,
  size = 18,
  ...props
}: VerifiedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="Verified"
      role="img"
      className={cn("inline-block mt-1 shrink-0", className)}
      {...props}
    >
      <path
        fill="#1DA1F2"
        d="M22.5 12c0 1.05-1.58 1.88-1.89 2.82-.32.98.53 2.55-.07 3.37-.61.84-2.35.5-3.19 1.11-.82.6-1.04 2.36-2.02 2.68-.94.31-2.17-.96-3.23-.96s-2.29 1.27-3.23.96c-.98-.32-1.2-2.08-2.02-2.68-.84-.61-2.58-.27-3.19-1.11-.6-.82.25-2.39-.07-3.37C3.08 13.88 1.5 13.05 1.5 12s1.58-1.88 1.89-2.82c.32-.98-.53-2.55.07-3.37.61-.84 2.35-.5 3.19-1.11.82-.6 1.04-2.36 2.02-2.68.94-.31 2.17.96 3.23.96s2.29-1.27 3.23-.96c.98.32 1.2 2.08 2.02 2.68.84.61 2.58.27 3.19 1.11.6.82-.25 2.39.07 3.37.31.94 1.89 1.77 1.89 2.82Z"
      />
      <path
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m7.75 12.35 2.7 2.7 5.8-6.1"
      />
    </svg>
  )
}

export { VerifiedIcon }