"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@workspace/ui/components/primitives/button";
import { useTheme } from "@/components/theme-provider";

type ThemeToggleProps = {
  darkLabel: string;
  lightLabel: string;
};

export function ThemeToggle({ darkLabel, lightLabel }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? lightLabel : darkLabel;

  return (
    <Button
      aria-label={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
      rounded="2xl"
      variant="outline"
      className="w-full justify-center gap-2"
    >
      {!mounted ? null : isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span>{label}</span>
    </Button>
  );
}
