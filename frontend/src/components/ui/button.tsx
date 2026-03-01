import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
    {
        variants: {
            variant: {
                default:
                    "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-95",
                destructive:
                    "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/25 active:scale-95",
                outline:
                    "border border-gray-300/60 bg-white/60 text-gray-800 hover:bg-white/90 backdrop-blur-sm active:scale-95",
                secondary:
                    "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95",
                ghost:
                    "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900",
                link:
                    "text-blue-600 underline-offset-4 hover:underline p-0 h-auto font-medium",
                shiny:
                    "relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]",
            },
            size: {
                default: "h-10 px-5 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-12 px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        if (asChild) {
            const Comp = Slot
            return (
                <Comp
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref as any}
                    {...(props as any)}
                />
            )
        }

        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
