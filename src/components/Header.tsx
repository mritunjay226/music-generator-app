"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ChevronRight } from "lucide-react";

const breadcrumbs: Record<string, string> = {
    "/dashboard": "Generator",
    "/dashboard/library": "My Library",
    "/dashboard/api-keys": "API Keys",
    "/dashboard/billing": "Billing",
};

export function Header() {
    const pathname = usePathname();
    const currentPage = breadcrumbs[pathname] ?? "Dashboard";

    return (
        <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-6 sticky top-0 z-10 w-full">
            <nav className="flex items-center gap-1.5 text-[13px]">
                <Link
                    href="/"
                    className="text-[var(--fg-4)] hover:text-foreground transition-colors font-medium"
                >
                    ACE Studio
                </Link>
                <ChevronRight size={13} className="text-[var(--border-strong)]" />
                <span className="font-semibold text-foreground">{currentPage}</span>
            </nav>

            <div className="flex items-center gap-4">
                <a
                    href="https://modal.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-[var(--fg-4)] hover:text-[var(--fg-2)] transition-colors"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Powered by Modal
                </a>
                <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />
                <UserButton />
            </div>
        </header>
    );
}
