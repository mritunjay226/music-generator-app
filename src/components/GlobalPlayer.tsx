"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat } from "lucide-react";
import { useEffect, useState, useRef } from "react";

function formatTime(seconds: number) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GlobalPlayer() {
    const { activeTrack, isPlaying, togglePlayPause, currentTime, seekTo, audioRef, isLooping, toggleLoop } = usePlayer();
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);

    // Sync duration when track changes
    useEffect(() => {
        if (activeTrack) setDuration(activeTrack.duration);
    }, [activeTrack]);

    // Spacebar keyboard shortcut
    useEffect(() => {
        if (!activeTrack) return;
        const handleKey = (e: KeyboardEvent) => {
            // Don't steal space from text inputs
            if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
            if (e.code === "Space") {
                e.preventDefault();
                togglePlayPause();
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [activeTrack, togglePlayPause]);

    // Volume control
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = muted ? 0 : volume;
        }
    }, [volume, muted, audioRef]);

    if (!activeTrack) return null;

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        seekTo(percentage * duration);
    };

    const isVocal = !activeTrack.lyrics.includes("[inst]");

    return (
        <div className="w-full z-50 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-8px_32px_rgba(17,17,16,0.08)] dark:shadow-none animate-in slide-in-from-bottom-4 duration-300">

            {/* Track Info */}
            <div className="flex items-center gap-3.5 w-full sm:w-1/3 min-w-0">
                {/* 3D CD Mini Thumbnail */}
                <div
                    className={`relative w-[48px] h-[48px] rounded-full shadow-[0_4px_12px_rgba(17,17,16,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden shrink-0 transition-transform duration-700 ease-out border border-[var(--border)] ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                    style={{ background: activeTrack.gradient }}
                >
                    {/* CD Rim/Lighting */}
                    <div className="absolute inset-0 rounded-full border border-white/10 shadow-[inset_0_2px_5px_rgba(255,255,255,0.15),inset_0_-2px_5px_rgba(0,0,0,0.3)] pointer-events-none" />
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1)_0%,transparent_60%)] pointer-events-none" />

                    {/* Center Hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[var(--bg)] rounded-full shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.05)] dark:shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.8),0_0_0_0.5px_rgba(255,255,255,0.05)] z-10 flex items-center justify-center">
                        <div className="w-1 h-1 bg-[#111110] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                    </div>
                </div>

                <div className="truncate min-w-0">
                    <p className="text-[13.5px] font-semibold text-[var(--fg)] truncate leading-tight">
                        {activeTrack.prompt || "Generated Track"}
                    </p>
                    <p className="text-[11.5px] text-[var(--fg-4)] font-medium truncate mt-0.5">
                        {isVocal ? "Vocal Track" : "Instrumental"}
                    </p>
                </div>
            </div>

            {/* Controls + Progress */}
            <div className="flex flex-col items-center flex-1 max-w-xl w-full px-2">
                {/* Playback buttons */}
                <div className="flex items-center gap-5 mb-2.5">
                    <button className="text-[var(--fg-4)] hover:text-[var(--fg-3)] transition-colors cursor-not-allowed" disabled>
                        <SkipBack size={18} className="fill-current" />
                    </button>

                    <button
                        onClick={togglePlayPause}
                        className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground hover:bg-[var(--fg-2)] text-background transition-all hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(17,17,16,0.2)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                    >
                        {isPlaying ? (
                            <Pause size={16} className="fill-current" />
                        ) : (
                            <Play size={16} className="fill-current ml-0.5" />
                        )}
                    </button>

                    <button className="text-[var(--fg-4)] hover:text-[var(--fg-3)] transition-colors cursor-not-allowed" disabled>
                        <SkipForward size={18} className="fill-current" />
                    </button>
                    
                    <button 
                        onClick={toggleLoop}
                        className={`relative p-1.5 rounded-md transition-all flex items-center justify-center  "text-[var(--fg-4)] hover:text-[var(--fg-3)] hover:bg-[var(--surface-2)]"}`}
                        title={isLooping ? "Disable repeat" : "Enable repeat"}
                    >
                        <Repeat size={16} strokeWidth={isLooping ? 2.5 : 2} />
                        {isLooping && (
                            <span className="absolute bottom-[5px] right-[5px] w-[6px] h-[6px] rounded-full bg-green-400 shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
                        )}
                    </button>
                </div>

                {/* Seek bar */}
                <div className="flex items-center w-full gap-2.5 text-[11.5px] text-[var(--fg-4)] font-medium tabular-nums">
                    <span className="w-8 text-right">{formatTime(currentTime)}</span>

                    <div
                        className="flex-1 h-1.5 bg-[var(--surface-3)] rounded-full cursor-pointer relative group"
                        onClick={handleSeek}
                    >
                        <div
                            className="absolute top-0 left-0 bottom-0 bg-foreground rounded-full transition-[width] duration-100"
                            style={{ width: `${progressPercent}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3.5 w-3.5 bg-background border-2 border-[var(--border-strong)] rounded-full shadow-[0_2px_8px_rgba(17,17,16,0.2)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>

                    <span className="w-8">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Volume — right aligned */}
            <div className="hidden sm:flex items-center justify-end gap-3 w-1/3">
                <button
                    onClick={() => setMuted((m) => !m)}
                    className="text-[var(--fg-4)] hover:text-foreground transition-colors"
                >
                    {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        setVolume(v);
                        if (v > 0) setMuted(false);
                    }}
                    className="w-24 h-1.5 rounded-full appearance-none cursor-pointer accent-foreground bg-[var(--surface-3)]"
                />
            </div>
        </div>
    );
}
