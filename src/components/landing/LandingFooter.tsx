import Link from "next/link";
import { Music } from "lucide-react";

const footerLinks = {
    Product: ["Features", "Pricing", "Changelog"],
    Developers: ["API Docs", "API Keys", "Status"],
    Company: ["About", "Twitter", "GitHub"],
};

export function LandingFooter() {
    return (
        <footer className="border-t border-[var(--border)] py-16 px-6 lg:px-16">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 bg-foreground rounded-[10px] flex items-center justify-center">
                                <Music size={17} strokeWidth={2.5} className="text-white" />
                            </div>
                            <span className="font-semibold text-[15px] tracking-tight text-foreground">
                                ACE Studio
                            </span>
                        </Link>
                        <p className="text-[13px] text-(--fg-3) leading-relaxed max-w-[200px]">
                            Studio-quality music generation, powered by AI.
                        </p>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([group, links]) => (
                        <div key={group}>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--fg-4)] mb-4">
                                {group}
                            </p>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link}>
                                        <Link
                                            href="#"
                                            className="text-[13.5px] text-(--fg-3) hover:text-foreground transition-colors"
                                        >
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="border-t border-[var(--border)] pt-7 flex flex-col md:flex-row justify-between items-center gap-3">
                    <p className="text-[12.5px] text-[var(--fg-4)]">
                        © {new Date().getFullYear()} ACE Studio. All rights reserved.
                    </p>
                    <div className="flex items-center gap-5 text-[12.5px] text-[var(--fg-4)]">
                        <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
