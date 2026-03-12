import Link from "next/link";
import { ArrowRight } from "lucide-react";

function MiniBar({ h, delay }: { h: number; delay: number }) {
    return (
        <div
            className="w-[3px] rounded-full bg-[var(--accent-blue)]"
            style={{
                height: `${h}px`,
                opacity: 0.25,
                animation: `wave-bounce 1.6s ease-in-out infinite`,
                animationDelay: `${delay}ms`,
            }}
        />
    );
}

export function EmptyLibrary() {
    const bars = [14, 24, 18, 30, 20, 26, 14, 22, 28, 16];
    return (
        <div className="border border-dashed border-[var(--border-strong)] rounded-[20px] p-16 flex flex-col items-center justify-center text-center">
            <div className="flex items-end gap-[3px] mb-8">
                {bars.map((h, i) => (
                    <MiniBar key={i} h={h} delay={i * 100} />
                ))}
            </div>
            <h2
                className="text-[22px] font-light tracking-tight text-foreground mb-2"
                style={{ fontFamily: "var(--font-serif)" }}
            >
                Your library is empty
            </h2>
            <p className="text-[13.5px] text-(--fg-3) max-w-xs leading-relaxed mb-7">
                Head to the Generator to create your first AI track. It'll appear here automatically.
            </p>
            <Link href="/dashboard">
                <button className="inline-flex items-center gap-2 h-10 px-5 text-[13px] font-semibold bg-foreground text-background rounded-[10px] hover:bg-[var(--fg-2)] transition-colors">
                    Create your first track
                    <ArrowRight size={13} />
                </button>
            </Link>
        </div>
    );
}
