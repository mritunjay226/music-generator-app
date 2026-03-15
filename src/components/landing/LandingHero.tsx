"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Show } from "@clerk/nextjs";
import WireMeshBackground from "./mesh-background/WireMesh";

function WaveformBars({ className = "" }: { className?: string }) {
    const heights = [16, 28, 46, 34, 58, 40, 26, 50, 34, 60, 42, 28, 46, 54, 32, 20, 48, 38, 26, 56];
    return (
        <div className={`flex items-center gap-[3px] ${className}`}>
            {heights.map((h, i) => (
                <div
                    key={i}
                    className="wave-bar"
                    style={{ height: `${h}px`, animationDelay: `${i * 70}ms` }}
                />
            ))}
        </div>
    );
}

function StatItem({ value, label }: { value: string; label: string }) {
    return (
        <div className="flex flex-col items-center md:items-start">
            <span
                className="text-[42px] font-light text-[#ebebe7] text-shadow-sm leading-none tracking-tight"
                // style={{ fontFamily: "var(--font-serif)" }}
            >
                {value}
            </span>
            <span className="text-[12px] font-medium text-[#111110] dark:text-white mt-1.5 uppercase tracking-wider">
                {label}
            </span>
        </div>
    );
}

export function LandingHero() {
    return (
        // <section className="w-full relative overflow-hidden mb-20 bg-linear-to-tl from-[#f8b627] via-[#f84d27] to-[#f9d423] " >
        <section className="w-full relative overflow-hidden mb-20 min-h-svh flex flex-col justify-center">
            <div className="absolute inset-0  h-full z-0 pointer-events-none">
                <WireMeshBackground theme="dark" direction="vertical" />
            </div>
            <div className="w-full max-w-6xl mx-auto px-6 lg:px-16 pt-32 pb-28 md:pt-40 relative z-30">
                {/* Headline */}
                <h1
                    className="text-center text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.04] tracking-[-0.03em] text-[#111110] dark:text-[#ebebe7] text-shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-[30px] duration-1000 ease-out fill-mode-both"
                    // style={{ fontFamily: "var(--font-serif)" }}
                >
                    A new era of<br className="hidden md:block" />{" "}
                    <em className="not-italic text-[#111110] dark:text-white animate-text-gradient pb-2">musical expression.</em>
                </h1>

                {/* Sub heading */}
                <p className="text-center text-[17px] text-[#2c2c29] dark:text-white/80 max-w-[520px] mx-auto leading-[1.65] mb-12 animate-in fade-in slide-in-from-bottom-[20px] duration-1000 delay-150 ease-out fill-mode-both">
                    Transform your imagination into studio-quality audio instantly. From cinematic scores to radio-ready beats, built for creators and visionaries.
                </p>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20 animate-in fade-in slide-in-from-bottom-[20px] duration-1000 delay-300 ease-out fill-mode-both">
                    <Show when="signed-out">
                        <Link href="/dashboard">
                            <button className="flex items-center gap-2 h-12 px-8 text-[14px] font-semibold bg-[#111110] dark:bg-white text-white dark:text-black rounded-[12px] hover:bg-[#2c2c29] dark:hover:bg-[#e4e4e7] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(17,17,16,0.3)] active:translate-y-0 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_4px_16px_rgba(17,17,16,0.28)]">
                                Enter Studio <ArrowRight size={15} />
                            </button>
                        </Link>
                        <Link href="#features">
                            <button className="flex items-center gap-2 h-12 px-8 text-[14px] font-medium text-[#2c2c29] dark:text-[#e4e4e7] bg-white dark:bg-[#101012] border-2 border-[#d8d7d0] dark:border-(--border) rounded-[12px] hover:border-[#b8b7ae] dark:hover:border-[var(--border-strong)] hover:bg-[#f6f5f0] dark:hover:bg-[var(--surface-2)] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                Discover More
                            </button>
                        </Link>
                    </Show>
                    <Show when="signed-in">
                        <Link href="/dashboard">
                            <button className="flex items-center gap-2 h-12 px-8 text-[14px] font-semibold bg-[#111110] dark:bg-white text-white dark:text-black rounded-[12px] hover:bg-[#2c2c29] dark:hover:bg-[#e4e4e7] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(17,17,16,0.3)] active:translate-y-0 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_4px_16px_rgba(17,17,16,0.28)]">
                                Return to Studio <ArrowRight size={15} />
                            </button>
                        </Link>
                    </Show>
                </div>

                {/* Mock product window */}
                <div className="relative mx-auto max-w-3xl rounded-[20px] bg-white dark:bg-[var(--surface)] border-2 border-[#d8d7d0] dark:border-(--border) shadow-[0_12px_48px_rgba(17,17,16,0.13)] dark:shadow-none overflow-hidden transition-transform duration-1000 hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-[40px] duration-1000 delay-500 ease-out fill-mode-both">
                    {/* Window chrome */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-[#d8d7d0] dark:border-(--border) bg-[#f0efe9] dark:bg-[var(--surface-2)]">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                        </div>
                        <p className="text-[11px] font-semibold text-[#5a5a54] dark:text-[var(--fg-3)]">ACE Studio Pro</p>
                        <div className="w-16" />
                    </div>

                    {/* Prompt row */}
                    <div className="px-6 py-5 border-b border-[#d8d7d0] dark:border-(--border) bg-white dark:bg-[var(--surface)]">
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8a8a82] dark:text-[var(--fg-4)] mb-2">Prompt</p>
                        <p className="text-[14px] font-medium text-[#111110] dark:text-[var(--fg-2)] leading-relaxed">
                            "Lush ambient electronic journey, sweeping analog synths, low pulsing bass frequencies, evoking a sense of deep space discovery"
                        </p>
                    </div>

                    {/* Waveform area */}
                    <div className="px-6 py-5 bg-white dark:bg-[var(--surface)]">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <button className="w-9 h-9 rounded-full bg-[#111110] dark:bg-white flex items-center justify-center hover:bg-[#2c2c29] dark:hover:bg-[#e4e4e7] hover:scale-105 active:scale-95 transition-all">
                                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                                        <path d="M3 2L10 6L3 10V2Z" className="fill-white dark:fill-black" />
                                    </svg>
                                </button>
                                <div>
                                    <p className="text-[13.5px] font-semibold text-[#111110] dark:text-white">Deep Space Discovery</p>
                                    <p className="text-[11.5px] text-[#5a5a54] dark:text-[var(--fg-3)] font-medium">1:24 · Mixed & Mastered</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-[#166534] bg-[#dcfce7] border border-[#86efac] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 px-2.5 py-1 rounded-full">
                                Ready
                            </span>
                        </div>
                        <WaveformBars className="w-full justify-center" />
                    </div>
                </div>

                {/* Social proof tags */}
                {/* <div className="flex flex-wrap items-center justify-center gap-2.5 mt-10 animate-in fade-in slide-in-from-bottom-[20px] duration-1000 delay-500 ease-out fill-mode-both">
                    {["🎵 Zero music theory required", "⚡ Fast generation times", "🔑 Developer APIs", "☁️ Secure cloud storage"].map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[var(--surface)] border-2 border-[#d8d7d0] dark:border-(--border) text-[12px] font-medium text-[#2c2c29] dark:text-[var(--fg-2)] hover:border-[#b8b7ae] dark:hover:border-[var(--border-strong)] hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-300 cursor-default shadow-sm dark:shadow-none">
                            {t}
                        </span>
                    ))}
                </div> */}

                {/* Stats */}
                {/* <div className="grid grid-cols-3 gap-8 mt-20 pt-10 border-t-2 border-[#d8d7d0] dark:border-(--border) max-w-lg mx-auto text-center">
                    <StatItem value="30s" label="Avg generation time" />
                    <StatItem value="∞" label="Genres supported" />
                    <StatItem value="100%" label="Cloud-stored" />
                </div> */}
            </div>
        </section>
    );
}
