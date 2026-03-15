"use client";

import Link from "next/link";
import { Music, ArrowRight } from "lucide-react";
import { Show } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function LandingNav() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <nav
            className={`h-[70px] px-6 lg:px-16 flex items-center justify-between fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
                ? "bg-background border-b border-(--border) shadow-sm dark:shadow-none"
                : "bg-transparent border-b border-transparent"
                }`}
        >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-foreground rounded-[10px] flex items-center justify-center">
                    <Music size={17} strokeWidth={2.5} className="text-background" />
                </div>
                <span className="font-semibold text-[15px] tracking-tight text-foreground">
                    ACE Studio
                </span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-(--fg-3)">
                {["Features", "Pricing", "API Docs"].map((item) => (
                    <Link
                        key={item}
                        href={`#${item.toLowerCase().replace(" ", "-")}`}
                        className="hover:text-foreground transition-all duration-300 hover:-translate-y-0.5"
                    >
                        {item}
                    </Link>
                ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <Show when="signed-out">
                    <Link href="/dashboard">
                        <button className="hidden sm:flex h-9 px-4 text-[13px] font-medium text-(--fg-3) hover:text-foreground hover:bg-(--surface-2) rounded-[12px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]">
                            Log in
                        </button>
                    </Link>
                    <Link href="/dashboard">
                        <button className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold bg-foreground text-background rounded-[12px] hover:bg-(--fg-2) transition-all duration-300 hover:scale-[1.03] hover:shadow-md active:scale-[0.97]">
                            Get Started <ArrowRight size={13} />
                        </button>
                    </Link>
                </Show>
                <Show when="signed-in">
                    <Link href="/dashboard">
                        <button className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold bg-[#111110] text-white rounded-[10px] hover:bg-[#2c2c29] transition-colors">
                            Open Studio <ArrowRight size={13} />
                        </button>
                    </Link>
                </Show>
            </div>
        </nav>
    );
}
