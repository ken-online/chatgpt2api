"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1 text-sm", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "relative",
        month_caption: "flex h-9 items-center justify-center font-medium",
        nav: "absolute inset-x-2 top-2 flex items-center justify-between",
        button_previous: "inline-flex size-8 items-center justify-center rounded-lg hover:bg-surface-secondary",
        button_next: "inline-flex size-8 items-center justify-center rounded-lg hover:bg-surface-secondary",
        weekdays: "mt-2 grid grid-cols-7 text-xs text-content-tertiary",
        weekday: "flex h-8 items-center justify-center font-normal",
        week: "grid grid-cols-7",
        day: "size-9 p-0 text-center",
        day_button: "size-9 rounded-lg text-sm transition hover:bg-surface-secondary",
        today: "font-semibold text-content",
        selected: "[&_button]:bg-primary-600 [&_button]:text-white [&_button]:hover:bg-primary-700",
        outside: "text-content-tertiary",
        disabled: "text-content-tertiary opacity-50",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  );
}

export { Calendar };
