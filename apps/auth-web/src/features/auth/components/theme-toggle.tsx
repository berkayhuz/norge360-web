"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@workspace/ui/components/primitives/button"

type ThemeToggleProps = {
  darkLabel: string
  lightLabel: string
}

export function ThemeToggle({ darkLabel, lightLabel }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const label = isDark ? lightLabel : darkLabel

  return (
    <Button
      aria-label={label}
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
