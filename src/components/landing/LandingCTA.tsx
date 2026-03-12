import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LandingCTA() {
    return (
        <section className="w-full max-w-6xl mx-auto px-6 lg:px-16 pb-28" >
            <div id="cta-box" className="rounded-[24px] text-white p-12 md:p-20 text-center relative overflow-hidden shadow-[0_20px_60px_rgba(17,17,16,0.15)] mx-auto max-w-5xl bg-zinc-950 dark:bg-zinc-900 border border-zinc-800">
                {/* Subtle radial glow */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/30 via-transparent to-transparent"
                />
                <div className="relative z-10 flex flex-col items-center" >
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-6">
                        Start Creating
                    </p>
                    <h2
                        className="text-[clamp(2.5rem,5.5vw,4.2rem)] font-light leading-[1.05] tracking-[-0.03em] text-white mb-6"
                        style={{ fontFamily: "var(--font-serif)" }}
                    >
                        Unleash your creativity.
                    </h2>
                    <p className="text-[16px] text-neutral-300 max-w-md mx-auto mb-10 leading-relaxed font-medium">
                        Join thousands of creators shaping the future of music production. Dive in and start composing immediately.
                    </p>
                    <Link href="/dashboard">
                        <button className="inline-flex items-center gap-2 h-14 px-10 text-[15px] font-semibold bg-white dark:bg-white text-foreground dark:text-black rounded-full hover:bg-neutral-100 dark:hover:bg-[#e4e4e7] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(255,255,255,0.25)] active:translate-y-0 active:scale-[0.97] shadow-[0_4px_20px_rgba(255,255,255,0.15)]">
                            Enter the Studio
                            <ArrowRight size={16} />
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
