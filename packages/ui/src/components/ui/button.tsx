import { forwardRef, type ButtonHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-[#1b8a4c] text-white hover:bg-[#166f3d]",
  secondary: "bg-[#2e74b5] text-white hover:bg-[#255f93]",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "bg-[#ef4444] text-white hover:bg-[#dc2626]",
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
      {...props}
    />
  )
})
