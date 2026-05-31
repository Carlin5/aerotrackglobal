"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-tight transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-cyan-500 text-bg-0 hover:bg-cyan-400 shadow-glow",
        accent:
          "bg-signal-orange text-white hover:bg-orange-500 shadow-glow-orange",
        ghost:
          "bg-transparent text-ink-1 hover:text-ink-0 hover:bg-white/[0.04] border border-line",
        outline:
          "bg-transparent text-ink-0 border border-line-strong hover:border-cyan-500/60",
        danger:
          "bg-signal-red/90 text-white hover:bg-signal-red",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
