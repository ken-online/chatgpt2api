import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-150",
  {
    variants: {
      variant: {
        default: "bg-primary-500/10 text-primary-600",
        secondary: "bg-surface-tertiary text-content-secondary",
        outline: "border border-border bg-surface text-content",
        success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        danger: "bg-red-500/15 text-red-700 dark:text-red-400",
        info: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
        violet: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
