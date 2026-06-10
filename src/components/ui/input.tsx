import * as React from "react"

import { cn } from "@/lib/utils"

const inputStyles =
  "min-h-11 w-full min-w-0 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--field-bg,var(--surface))] px-3 py-2 text-body text-[var(--field-fg,var(--navy))] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--field-placeholder,var(--text-muted))] focus-visible:border-[var(--navy-mid)] focus-visible:ring-[3px] focus-visible:ring-gold/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--danger)] aria-invalid:ring-[3px] aria-invalid:ring-danger/20 dark:border-[var(--border)] dark:bg-[var(--field-bg)] dark:text-[var(--field-fg)]"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(inputStyles, className)}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputStyles }
