import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "accent" | "outline"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border",
        variant === "default" && "bg-primary text-primary-foreground border-transparent",
        variant === "secondary" && "bg-muted text-foreground border-transparent",
        variant === "accent" && "bg-accent text-accent-foreground border-transparent",
        variant === "outline" && "bg-transparent border-foreground text-foreground",
        className
      )}
      {...props}
    />
  )
} 