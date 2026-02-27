import { forwardRef, type HTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export type CardProps = HTMLAttributes<HTMLDivElement>

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}
      {...props}
    />
  )
})

export const CardHeader = forwardRef<HTMLDivElement, CardProps>(function CardHeader(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />
})

export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <p ref={ref} className={cn("text-base font-semibold text-slate-900", className)} {...props} />
    )
  }
)

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn("text-sm text-slate-600", className)} {...props} />
})

export const CardContent = forwardRef<HTMLDivElement, CardProps>(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
})

export const CardFooter = forwardRef<HTMLDivElement, CardProps>(function CardFooter(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("flex items-center gap-2 p-5 pt-0", className)} {...props} />
})
