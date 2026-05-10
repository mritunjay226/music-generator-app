"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Maximize2, Minimize2, X, ChevronRight, Mic2 } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number) {
    if (isNaN(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface LyricLine { time: number | null; text: string; isSection: boolean; }

const SECTION_RE = /^(verse|chorus|bridge|outro|intro|hook|pre-chorus|inst|instrumental)/i;

function parseLyrics(raw: string): LyricLine[] {
    if (!raw || raw.trim() === "[inst]")
        return [{ time: null, text: "♪  Instrumental", isSection: true }];

    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    const result: LyricLine[] = [];

    for (const line of lines) {
        const ts = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d+))?\]/);
        if (ts) {
            const time = +ts[1] * 60 + +ts[2] + (ts[3] ? parseFloat(`0.${ts[3]}`) : 0);
            const text = line.replace(/^\[\d{1,2}:\d{2}(?:\.\d+)?\]\s*/, "").trim();
            if (text) result.push({ time, text, isSection: false });
            continue;
        }
        const sec = line.match(/^\[([^\]]+)\]/);
        if (sec && SECTION_RE.test(sec[1])) {
            const t = sec[1].trim();
            result.push({ time: null, text: t.charAt(0).toUpperCase() + t.slice(1), isSection: true });
            continue;
        }
        const text = line.replace(/^\[[^\]]*\]\s*/, "").trim();
        if (text) result.push({ time: null, text, isSection: false });
    }
    return result.length ? result : [{ time: null, text: raw.trim(), isSection: false }];
}

function getActiveIdx(lines: LyricLine[], t: number) {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].time !== null && lines[i].time! <= t) idx = i;
    }
    return idx;
}

/** Get display title from lyrics: first non-section lyric text */
function getTitleFromLyrics(lines: LyricLine[]): string {
    const first = lines.find(l => !l.isSection && l.text);
    if (!first) return "Generated Track";
    // Take up to first 5 words
    const words = first.text.split(" ").slice(0, 5).join(" ");
    return words.length < first.text.length ? words + "…" : words;
}

// ─── Wave bars ────────────────────────────────────────────────────────────────
function WaveBars() {
    return (
        <div className="flex items-end gap-[2px] h-[14px]">
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="wave-bar !w-[2px]" style={{ animationDelay: `${i * 160}ms` }} />
            ))}
        </div>
    );
}

// ─── Seek bar ─────────────────────────────────────────────────────────────────
function SeekBar({ progress, onSeek }: { progress: number; onSeek: (e: React.MouseEvent<HTMLDivElement>) => void }) {
    return (
        <div className="w-full h-1 bg-[var(--surface-3)] rounded-full cursor-pointer relative group" onClick={onSeek}>
            <div className="absolute inset-y-0 left-0 bg-foreground rounded-full transition-[width] duration-75" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-[var(--surface)] border-[2px] border-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MusicSidebar() {
    const { activeTrack, isPlaying, togglePlayPause, currentTime, duration, seekTo, audioRef, isLooping, toggleLoop, playNext, playPrev, isSidebarOpen, toggleSidebar } = usePlayer();

    const [isExpanded, setIsExpanded] = useState(false);
    const [volume, setVolume]         = useState(1);
    const [muted, setMuted]           = useState(false);
    const [imgErr, setImgErr]         = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [activeIdx, setActiveIdx]   = useState(-1);
    const [userScrolled, setUserScrolled] = useState(false);

    const lyricsRef    = useRef<HTMLDivElement>(null);
    const activeRef    = useRef<HTMLDivElement>(null);
    const scrollTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lyricLines  = useMemo(() => activeTrack ? parseLyrics(activeTrack.lyrics) : [], [activeTrack?._id]); // eslint-disable-line
    const hasTs       = useMemo(() => lyricLines.some(l => l.time !== null), [lyricLines]);
    const hasThumbnail = !!activeTrack?.thumbnailUrl && !imgErr;
    const title       = useMemo(() => getTitleFromLyrics(lyricLines), [lyricLines]);
    const progress    = duration > 0 ? (currentTime / duration) * 100 : 0;
    const isInstrumental = activeTrack?.lyrics.trim() === "[inst]";

    // Reset on track change
    useEffect(() => {
        setImgErr(false);
        setShowPrompt(false);
        setActiveIdx(-1);
        setUserScrolled(false);
        setIsExpanded(false);
    }, [activeTrack?._id]);

    // Track active lyric index — two modes:
    // 1. Timestamped lyrics → use exact time match
    // 2. No timestamps → proportional: spread lyric lines evenly across duration
    useEffect(() => {
        if (lyricLines.length === 0 || duration <= 0) return;

        if (hasTs) {
            // Mode 1: exact timestamp matching
            setActiveIdx(getActiveIdx(lyricLines, currentTime));
        } else {
            // Mode 2: proportional highlighting
            // Only count real lyric lines (not section headers) for distribution
            const lyricOnlyLines = lyricLines
                .map((l, i) => ({ ...l, origIdx: i }))
                .filter(l => !l.isSection);

            if (lyricOnlyLines.length === 0) return;

            const progress = currentTime / duration; // 0..1
            const rawPos = progress * lyricOnlyLines.length;
            const lyricPos = Math.min(Math.floor(rawPos), lyricOnlyLines.length - 1);
            setActiveIdx(lyricOnlyLines[lyricPos].origIdx);
        }
    }, [currentTime, duration, hasTs, lyricLines]);

    // Auto-scroll to active line
    useEffect(() => {
        if (userScrolled || !activeRef.current) return;
        activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [activeIdx, userScrolled]);

    // Detect user scroll → pause auto-scroll for 4s
    const onLyricsScroll = useCallback(() => {
        setUserScrolled(true);
        if (scrollTimer.current) clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => setUserScrolled(false), 4000);
    }, []);

    // Volume sync
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
    }, [volume, muted, audioRef]);

    // Escape closes fullscreen
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape" && isExpanded) setIsExpanded(false); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [isExpanded]);

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration);
    };

    if (!activeTrack) return null;

    // ── Fullscreen overlay ────────────────────────────────────────────────────
    if (isExpanded) {
        return (
            <>
                <div className="fixed inset-0 z-[200] bg-[var(--bg)] flex flex-col" >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 pt-7 pb-5 shrink-0">
                        <div className="flex items-center gap-2">
                            <Mic2 size={13} className="text-[var(--fg-4)]" />
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--fg-4)]">Now Playing</span>
                        </div>
                        <button onClick={() => setIsExpanded(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-foreground transition-colors">
                            <Minimize2 size={15} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 min-h-0 px-8 gap-12 pb-8">
                        {/* Left: Art + Controls */}
                        <div className="flex flex-col items-center justify-center w-[320px] shrink-0 gap-6">
                            {/* CD Art */}
                            <div className={`relative w-[220px] h-[220px] rounded-full overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-white/10 ${isPlaying ? "animate-[spin_8s_linear_infinite]" : ""}`}
                                style={hasThumbnail ? {} : { background: activeTrack.gradient }}>
                                {hasThumbnail && <img src={activeTrack.thumbnailUrl} alt="" onError={() => setImgErr(true)} className="absolute inset-0 w-full h-full object-cover" />}
                                <div className="absolute inset-0 rounded-full shadow-[inset_0_4px_20px_rgba(255,255,255,0.18),inset_0_-6px_20px_rgba(0,0,0,0.6)] border border-white/10 z-10 pointer-events-none" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-[var(--bg)] rounded-full z-20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 bg-foreground rounded-full" />
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center w-full">
                                <p className="text-[20px] font-bold text-foreground leading-tight">{title}</p>
                                {!isInstrumental && (
                                    <button onClick={() => setShowPrompt(v => !v)} className="mt-1.5 text-[11px] text-[var(--fg-4)] hover:text-foreground flex items-center gap-1 mx-auto transition-colors">
                                        <ChevronRight size={11} className={`transition-transform ${showPrompt ? "rotate-90" : ""}`} />
                                        {showPrompt ? "Hide prompt" : "Show prompt"}
                                    </button>
                                )}
                                {showPrompt && (
                                    <p className="mt-2 text-[12px] text-[var(--fg-3)] leading-relaxed bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-left">
                                        {activeTrack.prompt}
                                    </p>
                                )}
                            </div>

                            {/* Seek */}
                            <div className="w-full">
                                <SeekBar progress={progress} onSeek={handleSeek} />
                                <div className="flex justify-between mt-1.5 text-[10.5px] text-[var(--fg-4)] tabular-nums">
                                    <span>{fmt(currentTime)}</span>
                                    <span>{fmt(duration)}</span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-6">
                                <button onClick={toggleLoop} className={`relative p-1 transition-colors ${isLooping ? "text-foreground" : "text-[var(--fg-4)] hover:text-foreground"}`}>
                                    <Repeat size={16} strokeWidth={isLooping ? 2.5 : 2} />
                                    {isLooping && <span className="absolute bottom-1 right-1 w-[4px] h-[4px] rounded-full bg-[var(--accent-blue)]" />}
                                </button>
                                <button onClick={playPrev} className="text-[var(--fg-3)] hover:text-foreground transition-colors"><SkipBack size={22} className="fill-current" /></button>
                                <button onClick={togglePlayPause} className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 transition-all">
                                    {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
                                </button>
                                <button onClick={playNext} className="text-[var(--fg-3)] hover:text-foreground transition-colors"><SkipForward size={22} className="fill-current" /></button>
                                <button onClick={() => setMuted(m => !m)} className="text-[var(--fg-4)] hover:text-foreground transition-colors">
                                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                </button>
                            </div>

                            {/* Volume */}
                            <input type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
                                onChange={e => { const v = +e.target.value; setVolume(v); if (v > 0) setMuted(false); }}
                                className="w-full h-1 appearance-none rounded-full cursor-pointer accent-foreground bg-[var(--surface-3)]" />
                        </div>

                        {/* Right: Lyrics */}
                        <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--fg-4)]">Lyrics</p>
                                {hasTs && <span className="text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">Synced ✦</span>}
                            </div>
                            <div ref={lyricsRef} onScroll={onLyricsScroll} className="flex-1 overflow-y-auto pr-2"
                                style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 6%, black 92%, transparent 100%)" }}>
                                {lyricLines.map((line, i) => {
                                    const isActive = i === activeIdx;
                                    const isPast = !line.isSection && (
                                        hasTs
                                            ? (line.time !== null && line.time! < currentTime)
                                            : (activeIdx >= 0 && i < activeIdx)
                                    );
                                    return (
                                        <div key={i} ref={isActive ? activeRef : null}
                                            onClick={() => { if (hasTs && line.time !== null) { seekTo(line.time!); setUserScrolled(false); } }}
                                            className={`transition-all duration-400 leading-tight mb-4 select-none
                                                ${line.isSection ? "text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--fg-4)] mt-6 mb-2" :
                                                isActive ? "text-[28px] font-bold text-foreground" :
                                                isPast ? "text-[18px] font-medium text-[var(--fg-4)]" :
                                                "text-[18px] font-medium text-[var(--fg-3)]"}`}>
                                            {isActive && !line.isSection ? (
                                                <span className="block relative bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl px-5 py-3 -mx-5 overflow-hidden">
                                                    <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-foreground rounded-l-2xl" />
                                                    {line.text}
                                                </span>
                                            ) : line.isSection ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="flex-1 h-px bg-current opacity-40 w-5 inline-block" />
                                                    {line.text}
                                                    <span className="flex-1 h-px bg-current opacity-40 w-5 inline-block" />
                                                </span>
                                            ) : line.text}
                                        </div>
                                    );
                                })}
                                <div className="h-16" />
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── Sidebar (inline, pushes content) ──────────────────────────────────────
    return (
        <div className={`h-full bg-[var(--surface)] border-l border-[var(--border)] flex flex-col shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${isSidebarOpen ? "w-[360px]" : "w-0 border-l-0"}`}>
            <div className="w-[360px] h-full flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-[var(--border)] shrink-0">
                    <div className="flex items-center gap-2">
                        {isPlaying && <WaveBars />}
                        <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fg-4)]">Now Playing</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsExpanded(true)} title="Fullscreen"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--fg-4)] hover:text-foreground hover:bg-[var(--surface-2)] transition-all">
                            <Maximize2 size={13} />
                        </button>
                        <button onClick={toggleSidebar} title="Close"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--fg-4)] hover:text-foreground hover:bg-[var(--surface-2)] transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Art */}
                <div className="flex flex-col items-center px-6 pt-6 pb-4 shrink-0">
                    <div className={`relative w-[140px] h-[140px] rounded-full overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-white/10 ${isPlaying ? "animate-[spin_8s_linear_infinite]" : ""}`}
                        style={hasThumbnail ? {} : { background: activeTrack.gradient }}>
                        {hasThumbnail && <img src={activeTrack.thumbnailUrl} alt="" onError={() => setImgErr(true)} className="absolute inset-0 w-full h-full object-cover" />}
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_4px_18px_rgba(255,255,255,0.18),inset_0_-5px_18px_rgba(0,0,0,0.55)] border border-white/10 z-10 pointer-events-none" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--surface)] rounded-full z-20 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center">
                            <div className="w-2 h-2 bg-foreground rounded-full" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mt-4 text-center w-full">
                        <p className="text-[15px] font-bold text-foreground leading-tight line-clamp-1">{title}</p>
                        {!isInstrumental && (
                            <button onClick={() => setShowPrompt(v => !v)}
                                className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-[var(--fg-4)] hover:text-foreground transition-colors">
                                <ChevronRight size={10} className={`transition-transform duration-200 ${showPrompt ? "rotate-90" : ""}`} />
                                {showPrompt ? "Hide prompt" : "Reveal prompt"}
                            </button>
                        )}
                        {showPrompt && (
                            <p className="mt-2 text-[11.5px] text-[var(--fg-3)] leading-relaxed bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-left">
                                {activeTrack.prompt}
                            </p>
                        )}
                    </div>
                </div>

                {/* Seek Bar */}
                <div className="px-5 shrink-0">
                    <SeekBar progress={progress} onSeek={handleSeek} />
                    <div className="flex justify-between mt-1.5 text-[10px] text-[var(--fg-4)] tabular-nums">
                        <span>{fmt(currentTime)}</span>
                        <span>{fmt(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-5 px-5 py-3.5 shrink-0">
                    <button onClick={toggleLoop} className={`relative p-1 transition-colors ${isLooping ? "text-foreground" : "text-[var(--fg-4)] hover:text-foreground"}`}>
                        <Repeat size={15} strokeWidth={isLooping ? 2.5 : 2} />
                        {isLooping && <span className="absolute bottom-[4px] right-[4px] w-[4px] h-[4px] rounded-full bg-[var(--accent-blue)]" />}
                    </button>
                    <button onClick={playPrev} className="text-[var(--fg-3)] hover:text-foreground transition-colors"><SkipBack size={19} className="fill-current" /></button>
                    <button onClick={togglePlayPause} className="w-11 h-11 rounded-full bg-foreground text-background flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all">
                        {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
                    </button>
                    <button onClick={playNext} className="text-[var(--fg-3)] hover:text-foreground transition-colors"><SkipForward size={19} className="fill-current" /></button>
                    <button onClick={() => setMuted(m => !m)} className="text-[var(--fg-4)] hover:text-foreground transition-colors">
                        {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                </div>

                {/* Volume */}
                <div className="px-5 pb-3 shrink-0">
                    <input type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
                        onChange={e => { const v = +e.target.value; setVolume(v); if (v > 0) setMuted(false); }}
                        className="w-full h-1 appearance-none rounded-full cursor-pointer accent-foreground bg-[var(--surface-3)]" />
                </div>

                {/* Lyrics */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between px-5 mb-2 shrink-0">
                        <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-[var(--fg-4)]">Lyrics</p>
                        {hasTs
                            ? <span className="text-[9px] text-green-500 bg-green-500/10 border border-green-500/20 rounded-full px-1.5 py-0.5">Synced ✦</span>
                            : !isInstrumental && <span className="text-[9px] text-[var(--fg-4)] bg-[var(--surface-2)] border border-[var(--border)] rounded-full px-1.5 py-0.5">Static</span>
                        }
                    </div>

                    <div ref={lyricsRef} onScroll={onLyricsScroll}
                        className="flex-1 overflow-y-auto px-5 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 90%, transparent 100%)" }}>
                        {lyricLines.map((line, i) => {
                            const isActive = i === activeIdx;
                            // isPast works for both modes:
                            // timestamped → compare time; proportional → compare index < activeIdx
                            const isPast = !line.isSection && (
                                hasTs
                                    ? (line.time !== null && line.time! < currentTime)
                                    : (activeIdx >= 0 && i < activeIdx)
                            );
                            return (
                                <div key={i} ref={isActive ? activeRef : null}
                                    onClick={() => {
                                        if (hasTs && line.time !== null) { seekTo(line.time!); setUserScrolled(false); }
                                    }}
                                    className={`transition-all duration-300 leading-snug select-none
                                        ${line.isSection
                                            ? "text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--fg-4)] mt-5 mb-1.5"
                                            : isActive
                                                ? "text-[17px] font-bold text-foreground mb-3.5"
                                                : isPast
                                                    ? "text-[14px] font-medium text-[var(--fg-4)] mb-3"
                                                    : "text-[14px] font-medium text-[var(--fg-3)] mb-3"
                                        }`}>
                                    {/* Active line: bright pill with accent left border */}
                                    {isActive && !line.isSection ? (
                                        <span className="block relative bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2.5 -mx-3 overflow-hidden">
                                            <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-foreground rounded-l-xl" />
                                            {line.text}
                                        </span>
                                    ) : line.isSection ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="w-3 h-px bg-current opacity-50" />
                                            {line.text}
                                            <span className="w-3 h-px bg-current opacity-50" />
                                        </span>
                                    ) : line.text}
                                </div>
                            );
                        })}
                        <div className="h-10" />
                    </div>
                </div>
            </div>
        </div>
    );
}
