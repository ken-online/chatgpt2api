"use client";

import { Check, ChevronDown } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

export const IMAGE_SIZE_OPTIONS = [
  { value: "", label: "Không chỉ định" },
  { value: "1:1", label: "1:1 (Hình vuông)" },
  { value: "16:9", label: "16:9 (Ngang)" },
  { value: "4:3", label: "4:3 (Ngang)" },
  { value: "3:4", label: "3:4 (Dọc)" },
  { value: "9:16", label: "9:16 (Dọc)" },
];

export function getImageSizeLabel(value: string) {
  return IMAGE_SIZE_OPTIONS.find((option) => option.value === value)?.label || "Không chỉ định";
}

type ImageSizeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  /** "header": popup mở xuống dưới. "composer": popup mở lên trên. */
  variant?: "header" | "composer";
  className?: string;
};

export function ImageSizeSelect({ value, onChange, variant = "header", className }: ImageSizeSelectProps) {
  const label = getImageSizeLabel(value);

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs",
            "data-[state=open]:border-border",
            variant === "composer" && "sm:gap-2 sm:text-[13px]",
            className,
          )}
        >
          <span className="font-medium text-content">Tỷ lệ</span>
          <span className="font-bold text-content">{label}</span>
          <ChevronDown className="size-4 opacity-60 transition data-[state=open]:rotate-180" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={variant === "composer" ? "top" : "bottom"}
          align={variant === "composer" ? "start" : "end"}
          sideOffset={6}
          className="z-[60] w-[200px] rounded-2xl border border-border bg-surface p-2 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {IMAGE_SIZE_OPTIONS.map((option) => {
            const active = option.value === value;
            return (
              <PopoverPrimitive.Close asChild key={option.label}>
                <button
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-content transition hover:bg-surface-secondary",
                    active && "bg-surface-secondary font-medium",
                  )}
                >
                  <span>{option.label}</span>
                  {active ? <Check className="size-4" /> : null}
                </button>
              </PopoverPrimitive.Close>
            );
          })}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
