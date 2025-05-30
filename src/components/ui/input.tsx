import * as React from "react"

import {cn} from "@/lib/utils"

export interface InputProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
}

const Input = React.forwardRef<HTMLTextAreaElement, InputProps>(
    ({className, ...props}, ref) => {
        return (
            <textarea
                className={cn(
                    "flex w-full min-h-[2.5em] max-h-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-vertical overflow-auto",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export {Input}
