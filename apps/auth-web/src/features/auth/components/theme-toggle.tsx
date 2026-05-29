"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@workspace/ui/components/button"

type ThemeToggleProps = {
  darkLabel: string
  lightLabel: string
}

export function ThemeToggle({ darkLabel, lightLabel }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Button
      aria-label={isDark ? lightLabel : darkLabel}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      size="icon-sm"
      type="button"
      variant="outline"
      rounded="lg"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}