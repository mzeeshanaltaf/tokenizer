"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Icons are toggled purely via the `.dark` class (set by next-themes before
  // paint), so there is no theme-dependent state to hydrate and no mismatch.
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <MoonIcon size={18} weight="bold" className="block dark:hidden" />
      <SunIcon size={18} weight="bold" className="hidden dark:block" />
    </Button>
  );
}
