"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@workspace/ui/components/primitives/button"

import { useTheme } from "@/components/theme-provider"

type ThemeToggleProps = {
  darkLabel: string
  lightLabel: string
}

export function ThemeToggle({ darkLabel, lightLabel }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
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
      {!mounted ? null : isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
