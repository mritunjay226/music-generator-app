"use client";

import { useEffect, useState } from "react";
import { Play, Pause, X, Disc3 } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { usePathname } from "next/navigation";

export function FloatingPlayer() {
    const { activeTrack: track, isPlaying, togglePlayPause, setActiveTrack } = usePlayer();
    const [isVisible, setIsVisible] = useState(false);
    const pathname = usePathname();

    // Hide on dashboard
    const isDashboard = pathname?.startsWith('/dashboard');

    // Fade in/out animation
    useEffect(() => {
        if (track && !isDashboard) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [track, isDashboard]);

    // Track audio is handled globally in PlayerProvider now
    // We just render the UI here

    if (!track && !isVisible) return null;

    return (
        <div
            className={`group fixed bottom-6 right-6 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
            }`}
        >
            <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md rounded-2xl p-2.5 pr-4 pointer-events-auto w-[280px]">
                
                {/* Rotating CD Thumbnail */}
                <div 
                    className="relative shrink-0 w-[42px] h-[42px] rounded-full overflow-hidden shadow-sm flex items-center justify-center"
                    style={{ background: track?.gradient }}
                >
                    <div className="absolute inset-0 rounded-full border border-white/10 shadow-[inset_0_4px_14px_rgba(255,255,255,0.2),inset_0_-4px_14px_rgba(0,0,0,0.5)] pointer-events-none" />
                    
                    {/* Center CD hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[12px] h-[12px] bg-[var(--bg)] rounded-full z-10 
                        shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)]" 
                    />
                    
                    {/* The spinning icon */}
                    <Disc3 
                        size={42} 
                        className={`absolute text-white/30 ${isPlaying ? 'animate-spin' : ''}`} 
                        style={{ animationDuration: '3s' }} 
                        strokeWidth={1}
                    />
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                        {track?.prompt || "Unknown Track"}
                    </p>
                    <p className="text-[11px] text-[var(--fg-3)]">
                        Playing now
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={togglePlayPause}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] hover:bg-[var(--fg)] hover:text-[var(--bg)] text-foreground transition-colors"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
                    </button>
                    
                    <button
                        onClick={() => setActiveTrack(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--fg-4)] hover:text-foreground hover:bg-[var(--surface-3)] transition-all duration-200 opacity-0 group-hover:opacity-100"
                        aria-label="Dismiss Player"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
