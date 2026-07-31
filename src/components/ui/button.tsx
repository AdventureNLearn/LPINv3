import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[opacity,transform,filter,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* LPIN sunrise — primary CTAs */
        default:
          "btn-sunrise shadow-sm hover:brightness-105",
        /* Harbor secondary */
        secondary:
          "border border-border-strong bg-surface-2 text-fg hover:bg-surface-3 hover:border-[color-mix(in_oklab,var(--color-gold)_30%,var(--color-border))]",
        outline:
          "border border-[color-mix(in_oklab,var(--color-gold)_35%,var(--color-border))] bg-transparent text-fg hover:bg-surface-2 hover:text-gold",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-gold",
        /* Wave teal for secondary positive */
        success:
          "btn-wave hover:brightness-105",
        danger: "bg-disputed text-white hover:opacity-90 shadow-sm",
        hold: "bg-unproven text-ink hover:opacity-90 shadow-sm",
      },
      size: {
        default: "h-12 min-h-12 px-4 py-2",
        sm: "h-10 min-h-10 rounded-lg px-3 text-xs",
        lg: "h-13 min-h-[3.25rem] rounded-xl px-6 text-base",
        icon: "h-12 w-12 min-h-12 min-w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
