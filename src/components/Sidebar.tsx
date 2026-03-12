"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Music, Disc3, Library, Key, CreditCard, ChevronRight, Edit } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const studioRoutes = [
    { label: "Create", icon: Disc3, href: "/dashboard", exact: true },
    { label: "My Library", icon: Library, href: "/dashboard/library", exact: false },
    { label: "Ai Edit", icon: Edit, href: "/dashboard/edit", exact: false },
];

const devRoutes = [
    { label: "API Keys", icon: Key, href: "/dashboard/api-keys", exact: false },
    { label: "Billing", icon: CreditCard, href: "/dashboard/billing", exact: false },
];

function NavGroup({ label, routes }: { label: string; routes: typeof studioRoutes }) {
    const pathname = usePathname();
    const isActive = (r: (typeof routes)[0]) =>
        r.exact ? pathname === r.href : pathname.startsWith(r.href);

    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--fg-4)] px-3 mb-1.5">
                {label}
            </p>
            <div className="space-y-0.5">
                {routes.map((route) => {
                    const active = isActive(route);
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] group ${active
                                ? "bg-foreground text-background"
                                : "text-(--fg-3) hover:bg-[var(--surface-2)] hover:text-foreground"
                                }`}
                        >
                            <route.icon
                                size={15}
                                strokeWidth={1.8}
                                className={active ? "text-background" : "text-[var(--fg-4)] group-hover:text-foreground"}
                            />
                            <span className="flex-1">{route.label}</span>
                            {active && <ChevronRight size={12} className="text-neutral-400" />}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export function Sidebar() {
    return (
        <aside className="hidden md:flex flex-col h-full w-58 bg-[var(--surface)] border-r border-[var(--border)] px-3 py-5">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 px-3 mb-8">
                <div className="w-7 h-7 bg-foreground rounded-[8px] flex items-center justify-center shrink-0">
                    <Music size={14} strokeWidth={2.5} className="text-background" />
                </div>
                <span className="font-semibold text-[14.5px] tracking-tight text-foreground" style={{ letterSpacing: "-0.015em" }}>
                    ACE Studio
                </span>
            </Link>

            {/* Nav */}
            <nav className="flex-1 space-y-5">
                <NavGroup label="Studio" routes={studioRoutes} />
                <NavGroup label="Developer" routes={devRoutes} />
            </nav>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between px-3 mb-4">
                    <span className="text-[12px] font-medium text-(--fg-3)">Theme</span>
                    <ThemeToggle />
                </div>
                {/* <div className="px-3 py-2 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)]">
                    <p className="text-[11px] font-semibold text-[var(--fg-4)] uppercase tracking-wider mb-0.5">Free Plan</p>
                    <p className="text-[12px] text-(--fg-3)">0 / 10 tracks used</p>
                    <div className="mt-2 h-1 bg-[var(--surface-3)] rounded-full overflow-hidden">
                        <div className="h-full w-0 bg-[var(--accent-blue)] rounded-full" />
                    </div>
                    <Link
                        href="/dashboard/billing"
                        className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-[var(--accent-blue)] hover:underline"
                    >
                        Upgrade to Pro <ChevronRight size={10} />
                    </Link>
                </div> */}
            </div>
        </aside>
    );
}
