"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface LoadingTrackCardProps {
    prompt: string;
    duration: number;
    createdAt: number;
}

function getEstimatedMs(durationSec: number): number {
    return Math.max(45_000, durationSec * 1500);
}

function MiniWave() {
    const heights = [12, 22, 16, 28, 18, 24, 12, 20, 26, 14];
    return (
        <div className="flex items-center gap-[2.5px]">
            {heights.map((h, i) => (
                <div
                    key={i}
                    className="wave-bar"
                    style={{ height: `${h}px`, opacity: 0.45, animationDelay: `${i * 90}ms` }}
                />
            ))}
        </div>
    );
}

export function LoadingTrackCard({ prompt, duration, createdAt }: LoadingTrackCardProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const estimatedMs = getEstimatedMs(duration);
        const tick = () => {
            const elapsed = Date.now() - createdAt;
            const raw = Math.min(0.95, elapsed / estimatedMs);
            const eased = 1 - Math.pow(1 - raw, 2);
            setProgress(Math.round(eased * 95));
        };
        tick();
        const interval = setInterval(tick, 800);
        return () => clearInterval(interval);
    }, [createdAt, duration]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] overflow-visible mt-6 shadow-[0_4px_16px_rgba(17,17,16,0.04)] dark:shadow-none">
            {/* Animated gradient CD thumbnail - allows overflow */}
            <div className="h-[120px] w-full relative overflow-visible flex items-start justify-center pt-6 pb-2 px-4 rounded-t-[20px] bg-linear-to-b from-[var(--surface-2)] to-transparent">
                {/* 3D CD Wrapper - Escaping the top edge */}
                <div
                    className="relative w-[130px] h-[130px] -mt-10 rounded-full shadow-[0_12px_36px_rgba(17,17,16,0.2),0_4px_12px_rgba(17,17,16,0.1)] overflow-hidden animate-[spin_3s_linear_infinite]"
                    style={{ background: "linear-gradient(135deg, #e5e5e5 0%, #d4d4d4 50%, #a3a3a3 100%)" }}
                >
                    {/* CD Rim/Groove */}
                    <div className="absolute inset-0 rounded-full border border-white/20 shadow-[inset_0_4px_14px_rgba(255,255,255,0.4),inset_0_-4px_14px_rgba(0,0,0,0.2)] pointer-events-none" />

                    {/* Shimmer sweep */}
                    <div
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{
                            background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.6) 50%, transparent 80%)",
                            backgroundSize: "200% 100%",
                            animation: "progress-shimmer 2s ease-in-out infinite",
                        }}
                    />

                    {/* Center Hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30px] h-[30px] bg-[var(--bg)] rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_4px_8px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] z-20 flex items-center justify-center">
                        <div className="w-3 h-3 bg-foreground rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]" />
                    </div>
                </div>

                {/* Overlay mini wave */}
                <div className="absolute inset-0 flex items-center pt-2 justify-center z-30 pointer-events-none">
                    <div className="bg-[var(--surface-3)]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[var(--border)] shadow-sm">
                        <MiniWave />
                    </div>
                </div>
            </div>

            {/* Thin progress bar */}
            <div className="h-[3px] w-full bg-[var(--surface-3)] relative overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out progress-bar-animated"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Content Area */}
            <div className="px-5 pb-5 pt-2 space-y-3 relative z-10 bg-transparent rounded-b-[20px]">
                <p className="text-[14.5px] font-semibold text-[var(--fg)] line-clamp-2 min-h-[42px] leading-snug">
                    {prompt || "Generating your track…"}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--accent-blue)] font-semibold uppercase tracking-wide">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] animate-pulse" />
                        Generating… {progress}%
                    </div>
                    <span className="flex items-center gap-1 text-[11.5px] text-[#8a8a82] font-semibold uppercase tracking-wide">
                        <Clock size={11} strokeWidth={2} />
                        {formatTime(duration)}
                    </span>
                </div>
            </div>
        </div>
    );
}
