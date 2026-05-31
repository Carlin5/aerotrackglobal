"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg border border-line bg-bg-1/70 px-3 text-sm text-ink-0 placeholder:text-ink-3",
      "outline-none transition-colors duration-200",
      "focus:border-cyan-500/60 focus:bg-bg-1 focus:ring-2 focus:ring-cyan-500/20",
      "disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  
  return (
    <div className="relative">
      <input
        ref={ref}
        type={showPassword ? "text" : "password"}
        className={cn(
          "h-10 w-full rounded-lg border border-line bg-bg-1/70 px-3 pr-10 text-sm text-ink-0 placeholder:text-ink-3",
          "outline-none transition-colors duration-200",
          "focus:border-cyan-500/60 focus:bg-bg-1 focus:ring-2 focus:ring-cyan-500/20",
          "disabled:opacity-60",
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-1 transition-colors"
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[80px] w-full rounded-lg border border-line bg-bg-1/70 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3",
      "outline-none transition-colors duration-200",
      "focus:border-cyan-500/60 focus:bg-bg-1 focus:ring-2 focus:ring-cyan-500/20",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg border border-line bg-bg-1/70 px-3 text-sm text-ink-0",
      "outline-none transition-colors duration-200",
      "focus:border-cyan-500/60 focus:bg-bg-1 focus:ring-2 focus:ring-cyan-500/20",
      "appearance-none cursor-pointer",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium uppercase tracking-wider text-ink-2"
    >
      {children}
      {hint ? (
        <span className="ml-2 normal-case font-normal text-ink-3">{hint}</span>
      ) : null}
    </label>
  );
}

export function FieldRow({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}) {
  const map = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  } as const;
  return <div className={cn("grid gap-4", map[cols])}>{children}</div>;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
    </div>
  );
}
