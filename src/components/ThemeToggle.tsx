"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-8 h-8 shrink-0" />;
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-(--fg-3) hover:text-foreground hover:bg-[var(--surface-3)] transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
        >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
    );
}
