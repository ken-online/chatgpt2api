"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type ThemePreference } from "./theme-provider";

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<ThemePreference, string> = {
  light: "Chế độ sáng",
  dark: "Chế độ tối",
  system: "Theo hệ thống",
};

const NEXT: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];
  const label = LABELS[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary transition-colors hover:bg-surface-tertiary hover:text-content"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
