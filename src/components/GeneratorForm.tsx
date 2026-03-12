"use client";

import { useState } from "react";
import { Sparkles, Loader2, Info } from "lucide-react";
import { PROMPT_EXAMPLES, PROMPT_EXAMPLES_2 } from "@/lib/constants";

interface GeneratorFormProps {
    onGenerate: (prompt: string, lyrics: string, duration: number) => Promise<void>;
    isGenerating: boolean;
}

const PROMPT_MAX = 500;
const DURATION_MIN = 15;
const DURATION_MAX = 240;
const DURATION_DEFAULT = 30;



export function GeneratorForm({ onGenerate, isGenerating }: GeneratorFormProps) {
    const [prompt, setPrompt] = useState("");
    const [lyrics, setLyrics] = useState("[inst]");
    const [duration, setDuration] = useState(DURATION_DEFAULT);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        await onGenerate(prompt, lyrics, duration);
    };

    const promptCharsLeft = PROMPT_MAX - prompt.length;
    const durationPct = ((duration - DURATION_MIN) / (DURATION_MAX - DURATION_MIN)) * 100;

    const formatDuration = (s: number) => {
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return rem ? `${m}m ${rem}s` : `${m}m`;
    };

    return (
        <div className="bg-(--surface) border border-(--border) rounded-[12px] p-8 sm:p-10 relative overflow-hidden" style={{ fontFamily: "var(--font-inter)" }}>

            <div className="mb-8 relative z-10">
                <h2 className="text-[26px] font-semibold tracking-tight text-foreground leading-tight">
                    Create a new track
                </h2>
                <p className="text-[14.5px] text-(--fg-3) mt-2 font-medium">
                    Describe your sound and let the AI compose it instantly.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                {/* Prompt */}
                <div>
                    <div className="flex justify-between items-center mb-2.5">
                        <label htmlFor="prompt" className="text-[12px] font-bold text-foreground uppercase tracking-widest">
                            Prompt <span className="text-(--accent-blue)">*</span>
                        </label>
                        <span className={`text-[11.5px] font-bold tabular-nums ${promptCharsLeft < 50 ? "text-(--accent-blue)" : "text-(--fg-4)"}`}>
                            {promptCharsLeft} left
                        </span>
                    </div>
                    <textarea
                        id="prompt"
                        required
                        maxLength={PROMPT_MAX}
                        rows={4}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Cinematic epic orchestral battle music, high tension, brass and strings…"
                        className="w-full px-4 py-3.5 bg-transparent border-aura rounded-[12px] text-foreground text-[15px] leading-relaxed focus:bg-transparent focus:border-aura focus:outline-none focus:ring-0 transition-all resize-none placeholder:text-(--fg-4)"
                    />
                    {/* Quick prompts */}
                    {!prompt && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {PROMPT_EXAMPLES_2.map((ex) => (
                                <button
                                    key={ex.id}
                                    type="button"
                                    onClick={() => { setPrompt(ex.prompt); setLyrics(ex.lyrics); setDuration(ex.duration); }}
                                    className="text-[12px] font-medium px-3.5 py-1.5 rounded-full bg-(--surface-2) border border-(--border) text-(--fg-3) hover:text-foreground hover:bg-(--surface) hover:border-(--border-strong) transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] active:scale-[0.97] text-left"
                                >
                                    {ex.prompt.length > 40 ? ex.prompt.slice(0, 40) + "…" : ex.prompt}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lyrics */}
                <div>
                    <div className="flex justify-between items-center mb-2.5">
                        <label htmlFor="lyrics" className="text-[12px] font-bold text-foreground uppercase tracking-widest">
                            Lyrics
                        </label>
                        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-(--fg-4)">
                            <Info size={13} />
                            Use [inst] for instrumental
                        </span>
                    </div>
                    <textarea
                        id="lyrics"
                        rows={3}
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        placeholder={"[verse] Your lyrics here\n[chorus] Keep it going…"}
                        className="w-full px-4 py-3.5 bg-transparent border border-(--border) rounded-[12px] text-foreground text-[14px] font-mono leading-relaxed focus:bg-transparent focus:border-aura focus:outline-none focus:ring-0 transition-all resize-none placeholder:text-(--fg-4)"
                    />
                </div>

                {/* Duration */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label htmlFor="duration" className="text-[12px] font-bold text-foreground uppercase tracking-widest">
                            Duration
                        </label>
                        <span className="text-[22px] font-semibold text-foreground tabular-nums tracking-tight">
                            {formatDuration(duration)}
                        </span>
                    </div>

                    <div className="relative py-2 flex items-center group">
                        {/* Background track */}
                        <div className="absolute left-0 right-0 h-[6px] rounded-full bg-(--surface-3) border-[0.5px] border-(--border) overflow-hidden">
                            {/* Fill track */}
                            <div
                                className="h-full bg-foreground transition-all ease-out duration-150"
                                style={{ width: `${durationPct}%` }}
                            />
                        </div>

                        {/* The actual input */}
                        <input
                            type="range"
                            id="duration"
                            min={DURATION_MIN}
                            max={DURATION_MAX}
                            step={5}
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full h-[6px] appearance-none cursor-pointer bg-transparent relative z-10 focus:outline-none
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border-[2px] [&::-webkit-slider-thumb]:border-foreground [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing [&::-webkit-slider-thumb]:transition-transform group-hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95
                            [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:border-[2px] [&::-moz-range-thumb]:border-foreground [&::-moz-range-thumb]:cursor-grab active:[&::-moz-range-thumb]:cursor-grabbing [&::-moz-range-thumb]:transition-transform group-hover:[&::-moz-range-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-95"
                        />
                    </div>

                    <div className="flex justify-between text-[11.5px] text-(--fg-4) font-semibold mt-2">
                        <span>{DURATION_MIN}s</span>
                        <span>{Math.floor(DURATION_MAX / 60)}m</span>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full h-14 mt-6 flex items-center justify-center gap-2.5 rounded-[12px] bg-foreground text-background text-[15px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--fg-2)] hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(17,17,16,0.15)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none group"
                >
                    {isGenerating ? (
                        <><Loader2 size={18} className="animate-spin text-background opacity-70" />Generating audio…</>
                    ) : (
                        <><Sparkles size={17} className="text-background opacity-70 group-hover:opacity-100 transition-opacity" />Generate Track</>
                    )}
                </button>
            </form>
        </div>
    );
}
