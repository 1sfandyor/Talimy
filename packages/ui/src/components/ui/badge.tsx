import type { HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

type BadgeVariant = "default" | "success" | "warning" | "error"

export type BadgeProps = HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant
}

const BADGE_VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  error: "bg-rose-100 text-rose-700 border-rose-200",
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        BADGE_VARIANT_CLASS[variant],
        className
      )}
      {...props}
    />
  )
}
