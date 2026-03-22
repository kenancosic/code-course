import * as React from "react"
import { cn } from "../../../lib/utils"

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'fantasy', size?: 'sm' | 'default' | 'lg' }>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-slate-50 text-slate-900 hover:bg-slate-50/90": variant === "default",
            "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-100": variant === "outline",
            "hover:bg-slate-800 hover:text-slate-50 text-slate-300": variant === "ghost",
            "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-500 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]": variant === "fantasy",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
