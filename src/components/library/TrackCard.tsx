"use client";

import { Play, Pause, MoreVertical, Trash2, DownloadCloud, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { Track } from "@/contexts/PlayerContext";

interface TrackCardProps {
    track: Track;
    isActive: boolean;
    isPlaying: boolean;
    onPlay: (track: Track) => void;
    onTogglePlayPause: () => void;
}

function formatDate(ms: number) {
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(seconds: number) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TrackCard({ track, isActive, isPlaying, onPlay, onTogglePlayPause }: TrackCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [imgError, setImgError] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const deleteTrack = useMutation(api.tracks.deleteTrack);

    const hasThumbnail = !!track.thumbnailUrl && !imgError;

    // Close on click outside — using document listener, no backdrop div inside card
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current?.contains(e.target as Node) ||
                buttonRef.current?.contains(e.target as Node)
            ) return;
            setMenuOpen(false);
        };
        // Small delay so the same click that opens doesn't immediately close
        const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener("mousedown", handler);
        };
    }, [menuOpen]);

    // Close on Escape
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [menuOpen]);

    const handlePlayClick = () => {
        if (!track.url) return;
        if (isActive) { onTogglePlayPause(); } else { onPlay(track); }
    };

    const handleDelete = async () => {
        setMenuOpen(false);
        await deleteTrack({ trackId: track._id as Id<"tracks"> });
    };

    return (
        <div
            className={`bg-(--surface) border rounded-[12px] overflow-visible transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(17,17,16,0.06)] group relative hover-lift mt-6 ${
                isActive
                    ? "border-aura"
                    : "border-(--border) hover:border-(--border-strong)"
            }`}
        >
            {/* Thumbnail Container */}
            <div
                className="h-[120px] w-full relative flex items-start justify-center cursor-pointer pt-6 pb-2 px-4 rounded-t-[12px] bg-linear-to-b from-(--surface-2) to-transparent"
                onClick={handlePlayClick}
            >
                {/* 3D CD Wrapper */}
                <div
                    className={`relative w-[130px] h-[130px] -mt-10 rounded-full shadow-[0_12px_36px_rgba(17,17,16,0.2),0_4px_12px_rgba(17,17,16,0.1)] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:-translate-y-1.5 ${
                        isPlaying && isActive ? "animate-[spin_4s_linear_infinite]" : ""
                    }`}
                    style={hasThumbnail ? {} : { background: track.gradient }}
                >
                    {/* Thumbnail image */}
                    {hasThumbnail && (
                        <img
                            src={track.thumbnailUrl}
                            alt={track.prompt}
                            onError={() => setImgError(true)}
                            className="absolute inset-0 w-full h-full object-cover rounded-full"
                            draggable={false}
                        />
                    )}

                    {/* CD Rim/Lighting */}
                    <div className={`absolute inset-0 rounded-full pointer-events-none z-10 border ${
                        hasThumbnail
                            ? "border-white/20 shadow-[inset_0_4px_20px_rgba(255,255,255,0.25),inset_0_-6px_20px_rgba(0,0,0,0.7),inset_0_0_0_3px_rgba(255,255,255,0.06)]"
                            : "border-white/10 shadow-[inset_0_4px_14px_rgba(255,255,255,0.2),inset_0_-4px_14px_rgba(0,0,0,0.5)]"
                    }`} />
                    <div className={`absolute inset-0 rounded-full pointer-events-none z-10 ${
                        hasThumbnail
                            ? "bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.22)_0%,transparent_55%)]"
                            : "bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15)_0%,transparent_60%)]"
                    }`} />
                    {hasThumbnail && (
                        <div className="absolute inset-0 rounded-full pointer-events-none z-10 shadow-[inset_0_0_18px_rgba(0,0,0,0.55)]" />
                    )}

                    {/* Center Hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30px] h-[30px] bg-background rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)] dark:shadow-[inset_0_4px_8px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)] z-20 flex items-center justify-center">
                        <div className="w-3 h-3 bg-foreground rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]" />
                    </div>

                    {/* Hover Overlay */}
                    <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 z-30 ${
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}>
                        <div className="h-[42px] w-[42px] bg-white rounded-full flex items-center justify-center text-black shadow-[0_8px_20px_rgba(17,17,16,0.3)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                            {isActive && isPlaying
                                ? <Pause size={18} className="text-black fill-background" />
                                : <Play size={18} className="text-black" />
                            }
                        </div>
                    </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[var(--surface-3)]/90 backdrop-blur-sm border border-(--border) rounded-full px-2.5 py-1.5 shadow-sm z-30">
                        {isPlaying ? (
                            <>
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="wave-bar !w-[2px] !h-3" style={{ animationDelay: `${i * 150}ms` }} />
                                ))}
                            </>
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)]" />
                        )}
                        <span className="text-[10px] font-semibold text-[var(--fg)] ml-0.5">
                            {isPlaying ? "Playing" : "Paused"}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="px-5 pb-5 pt-2 relative z-10">
                <p
                    className="text-[14.5px] font-semibold text-[var(--fg)] line-clamp-2 mb-3 leading-snug min-h-[42px]"
                    title={track.prompt}
                >
                    {track.prompt || "Untitled AI Generation"}
                </p>
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--fg-4)] font-semibold tracking-wide uppercase">
                        <Clock size={11} strokeWidth={2} />
                        {formatTime(track.duration)}
                    </span>
                    <span className="text-[11.5px] text-[var(--fg-4)] font-medium">{formatDate(track._creationTime)}</span>
                </div>
            </div>

            {/* Actions menu button */}
            <div className="absolute top-3 right-3 z-40">
                <button
                    ref={buttonRef}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                    className="h-7 w-7 rounded-full bg-[var(--surface-3)]/90 backdrop-blur-md border border-(--border) flex items-center justify-center text-[var(--fg-3)] hover:text-foreground hover:bg-[var(--surface-2)] transition-colors shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                >
                    <MoreVertical size={13} />
                </button>

                {/* Dropdown — rendered in a portal so it never affects card layout */}
                {menuOpen && typeof window !== "undefined" && createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[9999] w-48 bg-(--surface) border border-(--border) rounded-[12px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-fade-up"
                        style={{
                            top: (buttonRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
                            left: (buttonRef.current?.getBoundingClientRect().right ?? 0) - 192,
                        }}
                    >
                        {track.url && (
                            <a
                                href={track.url}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[var(--fg-2)] hover:bg-[var(--surface-2)] transition-all duration-200 hover:pl-5"
                                onClick={() => setMenuOpen(false)}
                            >
                                <DownloadCloud size={15} className="text-[var(--fg-4)]" />
                                Download Audio
                            </a>
                        )}
                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 border-t border-(--border) transition-all duration-200 hover:pl-5"
                        >
                            <Trash2 size={15} />
                            Delete Track
                        </button>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
}