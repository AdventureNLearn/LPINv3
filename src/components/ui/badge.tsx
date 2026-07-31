import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-2 text-fg-muted",
        supported: "border-supported/30 bg-supported/15 text-supported",
        unproven: "border-unproven/35 bg-unproven/15 text-unproven",
        disputed: "border-disputed/35 bg-disputed/15 text-disputed",
        honesty:
          "border-unproven/50 bg-transparent text-unproven border-dashed",
        p0: "border-disputed/40 bg-disputed/15 text-disputed",
        p1: "border-unproven/40 bg-unproven/15 text-unproven",
        p2: "border-accent/30 bg-accent/10 text-fg",
        p3: "border-border bg-surface-2 text-fg-muted",
        clean: "border-supported/30 bg-supported/15 text-supported",
        blocked: "border-disputed/40 bg-disputed/15 text-disputed",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
