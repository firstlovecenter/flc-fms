import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--field-bg,var(--surface))] px-3 py-2 text-body text-[var(--field-fg,var(--navy))] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--field-placeholder,var(--text-muted))] focus-visible:border-[var(--navy-mid)] focus-visible:ring-3 focus-visible:ring-[var(--gold)]/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--danger)] aria-invalid:ring-3 aria-invalid:ring-[var(--danger)]/20 dark:border-[var(--border)] dark:bg-[var(--field-bg)] dark:text-[var(--field-fg)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
