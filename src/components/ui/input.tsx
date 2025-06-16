import * as React from "react"
import {cn} from "@/lib/utils"

// Discriminated Union für Props
export type InputProps =
    | ({ as?: 'input' } & React.InputHTMLAttributes<HTMLInputElement>)
    | ({ as: 'textarea' } & React.TextareaHTMLAttributes<HTMLTextAreaElement>);

const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
    (props, ref) => {
        const {as = 'textarea', className, ...rest} = props as any;
        if (as === 'input') {
            return (
                <input
                    className={cn(
                        "flex w-full h-[2.5em] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    ref={ref as React.Ref<HTMLInputElement>}
                    {...rest}
                />
            );
        }
        return (
            <textarea
                className={cn(
                    "flex w-full min-h-[2.5em] h-[2.5em] max-h-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-vertical overflow-auto",
                    className
                )}
                ref={ref as React.Ref<HTMLTextAreaElement>}
                {...rest}
            />
        );
    }
);
Input.displayName = "Input"

export {Input}
