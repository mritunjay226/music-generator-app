import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", children, isLoading, variant = "primary", size = "md", disabled, ...props }, ref) => {

        const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:pointer-events-none disabled:opacity-50";

        const variants = {
            primary: "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm",
            secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
            outline: "border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-900",
            ghost: "hover:bg-neutral-100 hover:text-neutral-900 text-neutral-600",
        };

        const sizes = {
            sm: "h-9 px-3 text-sm",
            md: "h-11 px-4 py-2",
            lg: "h-12 px-8 text-lg",
        };

        const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} w-full sm:w-auto ${className}`;

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={combinedClasses}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";
