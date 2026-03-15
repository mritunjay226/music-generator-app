"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Track } from "@/contexts/PlayerContext";
import {
    Loader2, Upload, Music2, Wand2, CheckCircle2,
    AlertCircle, RefreshCw, ChevronRight, Zap,
    Mic, Shuffle, Layers, GitBranch, Paintbrush,
    Clock, Search, X, Play, Pause, Scissors,
    Download, ExternalLink
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type TaskType = "repaint" | "continuation" | "remix" | "extract" | "cover";

interface RepaintJob {
    status: "idle" | "repainting" | "queued" | "failed";
    error?: string;
    trackId?: string;
}

// ─── Task definitions ────────────────────────────────────────────────────────

const TASKS: {
    id: TaskType;
    label: string;
    icon: React.FC<{ size?: number; className?: string }>;
    tagline: string;
    description: string;
    needsRegion: boolean;
    needsReference: boolean;
    referenceLabel?: string;
    referencePlaceholder?: string;
    promptPlaceholder: string;
    submitLabel: string;
    needsPrompt: boolean;
    // What task_type to actually send to the API
    apiTaskType?: string;
}[] = [
        {
            id: "repaint",
            label: "Repaint",
            icon: Paintbrush,
            tagline: "Rewrite a section",
            description: "Select a region of your track and rewrite it with a new prompt. Everything outside the selection stays intact.",
            needsRegion: true,
            needsReference: false,
            promptPlaceholder: "Describe what the section should sound like…",
            submitLabel: "Repaint Section",
            needsPrompt: true,
        },
        {
            id: "continuation",
            label: "Continue",
            icon: GitBranch,
            tagline: "Extend the track",
            description: "Pick a point in the track and generate new music continuing from there.",
            needsRegion: false,
            needsReference: false,
            promptPlaceholder: "Describe how the continuation should sound…",
            submitLabel: "Generate Continuation",
            needsPrompt: true,
        },
        {
            id: "remix",
            label: "Remix",
            icon: Shuffle,
            tagline: "Style transfer",
            description: "Reinterpret the entire track in a new style using a reference audio. The melody and structure are preserved but the sound changes.",
            needsRegion: false,
            needsReference: true,
            referenceLabel: "Reference Style Audio",
            referencePlaceholder: "Cloudinary URL of the style you want to apply…",
            promptPlaceholder: "Describe the remix style (e.g. 'lo-fi hip hop', 'orchestral')…",
            submitLabel: "Create Remix",
            needsPrompt: true,
        },
        {
            id: "extract",
            label: "Extract",
            icon: Layers,
            tagline: "Stem separation",
            description: "Isolate or remove specific elements (vocals, bass, drums) using a reference audio as guidance.",
            needsRegion: false,
            needsReference: true,
            referenceLabel: "Reference Audio",
            referencePlaceholder: "Cloudinary URL of reference audio for extraction…",
            promptPlaceholder: "What do you want to extract? (e.g. 'vocals only', 'remove drums')…",
            submitLabel: "Extract Stems",
            needsPrompt: true,
        },
        {
            id: "cover",
            label: "Voice Cover",
            icon: Mic,
            tagline: "Zero-shot voice clone",
            description: "Clone a voice from a short reference clip and sing the track with that voice. No training needed — instant timbre transfer.",
            needsRegion: false,
            needsReference: true,
            referenceLabel: "Voice Reference (30s clip)",
            referencePlaceholder: "Cloudinary URL of the voice you want to clone…",
            promptPlaceholder: "Describe the vocal style or leave blank for automatic…",
            submitLabel: "Generate Cover",
            needsPrompt: false,
            // cover maps to task_type="cover" in the API (Modal now accepts it)
            apiTaskType: "cover",
        },
    ];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(s: number) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function formatDate(ms: number) {
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelative(ms: number) {
    const diff = Date.now() - ms;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return formatDate(ms);
}

// FIX: was process.env.CLOUDINARY_CLOUD_NAME (server-only, always undefined client-side)
// Must be NEXT_PUBLIC_ prefixed for browser access.
async function uploadToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

    if (!cloudName || !uploadPreset) {
        throw new Error(
            "Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET env vars"
        );
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("resource_type", "video");

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error(`Cloudinary upload failed: ${await res.text()}`);
    return (await res.json()).secure_url as string;
}

// ─── Region Selector ──────────────────────────────────────────────────────────

const BARS = Array.from({ length: 72 }, (_, i) =>
    Math.max(12, Math.min(88, 30 + Math.sin(i * 0.37) * 22 + Math.sin(i * 1.13) * 14 + (((i * 7919) % 97) / 97) * 18))
);

function RegionSelector({
    duration, start, end, onChange, currentTime,
}: {
    duration: number; start: number; end: number;
    onChange: (s: number, e: number) => void; currentTime: number;
}) {
    const barRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ type: "start" | "end" | "region"; offset: number } | null>(null);

    const toTime = useCallback((clientX: number) => {
        if (!barRef.current) return 0;
        const r = barRef.current.getBoundingClientRect();
        return Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * duration * 10) / 10;
    }, [duration]);

    const startDrag = useCallback((e: React.MouseEvent, type: "start" | "end" | "region") => {
        e.preventDefault();
        e.stopPropagation();
        drag.current = { type, offset: type === "region" ? toTime(e.clientX) - start : 0 };
    }, [toTime, start]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!drag.current) return;
            const t = toTime(e.clientX);
            const { type, offset } = drag.current;
            if (type === "start") onChange(Math.min(t, end - 0.5), end);
            else if (type === "end") onChange(start, Math.max(t, start + 0.5));
            else {
                const len = end - start;
                const ns = Math.max(0, Math.min(t - offset, duration - len));
                onChange(ns, ns + len);
            }
        };
        const onUp = () => { drag.current = null; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [start, end, duration, toTime, onChange]);

    const pct = (s: number) => `${Math.max(0, Math.min(100, (s / duration) * 100))}%`;
    const regionWidth = `${Math.max(0, ((end - start) / duration) * 100)}%`;

    return (
        <div className="select-none space-y-3">
            <div ref={barRef} className="relative h-14 rounded-[10px] bg-(--surface-2) border border-(--border) overflow-hidden cursor-crosshair">
                <div className="absolute inset-0 flex items-center gap-[2px] px-1.5">
                    {BARS.map((h, i) => {
                        const t = (i / BARS.length) * duration;
                        const inRegion = t >= start && t <= end;
                        return (
                            <div key={i} className="flex-1 rounded-full"
                                style={{ height: `${h}%`, background: inRegion ? "var(--accent-blue)" : "var(--border-strong)", opacity: inRegion ? 0.85 : 0.4 }}
                            />
                        );
                    })}
                </div>
                <div className="absolute top-0 bottom-0 bg-(--accent-blue)/8 cursor-grab active:cursor-grabbing"
                    style={{ left: pct(start), width: regionWidth }}
                    onMouseDown={(e) => startDrag(e, "region")}
                />
                <div className="absolute top-0 bottom-0 w-[3px] bg-(--accent-blue) cursor-ew-resize z-10"
                    style={{ left: pct(start) }}
                    onMouseDown={(e) => startDrag(e, "start")}
                >
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-(--accent-blue) rounded-full shadow-md border-2 border-white/20" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-(--accent-blue) rounded-full shadow-md border-2 border-white/20" />
                </div>
                <div className="absolute top-0 bottom-0 w-[3px] bg-(--accent-blue) cursor-ew-resize z-10"
                    style={{ left: pct(end) }}
                    onMouseDown={(e) => startDrag(e, "end")}
                >
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-(--accent-blue) rounded-full shadow-md border-2 border-white/20" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-(--accent-blue) rounded-full shadow-md border-2 border-white/20" />
                </div>
                {duration > 0 && currentTime > 0 && (
                    <div className="absolute top-0 bottom-0 w-px bg-white/60 pointer-events-none z-20"
                        style={{ left: pct(currentTime) }} />
                )}
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-(--fg-4) font-semibold uppercase tracking-wider">Start</label>
                        <input type="number" min={0} max={end - 0.5} step={0.5} value={start}
                            onChange={e => onChange(Math.max(0, Math.min(parseFloat(e.target.value) || 0, end - 0.5)), end)}
                            className="w-16 px-2 py-1 text-[12px] font-semibold text-foreground bg-(--surface-2) border border-(--border) rounded-[6px] focus:outline-none focus:border-(--accent-blue)"
                        />
                    </div>
                    <span className="text-(--fg-4)">→</span>
                    <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-(--fg-4) font-semibold uppercase tracking-wider">End</label>
                        <input type="number" min={start + 0.5} max={duration} step={0.5} value={end}
                            onChange={e => onChange(start, Math.max(start + 0.5, Math.min(parseFloat(e.target.value) || 0, duration)))}
                            className="w-16 px-2 py-1 text-[12px] font-semibold text-foreground bg-(--surface-2) border border-(--border) rounded-[6px] focus:outline-none focus:border-(--accent-blue)"
                        />
                    </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-(--accent-blue-light) border border-(--accent-blue-border) text-(--accent-blue) font-semibold text-[11px]">
                    {formatTime(end - start)} selected
                </span>
            </div>
        </div>
    );
}

// ─── Track Picker ─────────────────────────────────────────────────────────────

function TrackPicker({ tracks, selected, onSelect, isPlaying, activeTrackId, onTogglePlay }: {
    tracks: Track[]; selected: Track | null;
    onSelect: (t: Track) => void;
    isPlaying: boolean; activeTrackId?: string;
    onTogglePlay: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = tracks.filter(t =>
        !search || t.prompt.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[10px] border transition-all duration-200 text-left ${selected
                    ? "border-(--border-strong) bg-(--surface)"
                    : "border-dashed border-(--border) bg-(--surface-2) hover:border-(--border-strong)"
                    }`}
            >
                {selected ? (
                    <>
                        <div className="w-8 h-8 rounded-full shrink-0 relative" style={{ background: selected.gradient }}>
                            <div className="absolute inset-0 rounded-full flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-background" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">{selected.prompt || "Untitled"}</p>
                            <p className="text-[11px] text-(--fg-4)">{formatTime(selected.duration)} · {formatDate(selected._creationTime)}</p>
                        </div>
                        {selected.url && (
                            <button
                                onClick={e => { e.stopPropagation(); onTogglePlay(); }}
                                className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--fg-3)] hover:text-[var(--fg)] flex-shrink-0 transition-colors"
                            >
                                {isPlaying && activeTrackId === selected._id
                                    ? <Pause size={11} className="fill-current" />
                                    : <Play size={11} className="fill-current ml-0.5" />
                                }
                            </button>
                        )}
                        <ChevronRight size={13} className={`text-[var(--fg-4)] flex-shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center flex-shrink-0">
                            <Music2 size={14} className="text-[var(--fg-4)]" />
                        </div>
                        <span className="text-[13px] text-[var(--fg-4)]">Choose a track from your library…</span>
                        <ChevronRight size={13} className={`text-[var(--fg-4)] ml-auto flex-shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
                    </>
                )}
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 overflow-hidden animate-fade-up">
                    <div className="p-2 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded-[8px]">
                            <Search size={12} className="text-[var(--fg-4)]" />
                            <input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search tracks…"
                                className="flex-1 text-[12.5px] bg-transparent text-[var(--fg)] placeholder:text-[var(--fg-4)] focus:outline-none"
                            />
                            {search && (
                                <button onClick={() => setSearch("")}>
                                    <X size={11} className="text-[var(--fg-4)]" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="py-6 text-center text-[12px] text-[var(--fg-4)]">No tracks found</div>
                        ) : (
                            filtered.map(track => (
                                <button
                                    key={track._id}
                                    onClick={() => { onSelect(track); setOpen(false); setSearch(""); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left ${selected?._id === track._id ? "bg-[var(--accent-blue-light)]" : ""}`}
                                >
                                    <div className="w-7 h-7 rounded-full flex-shrink-0 relative" style={{ background: track.gradient }}>
                                        <div className="absolute inset-0 rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-[var(--bg)]" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[12.5px] font-semibold truncate ${selected?._id === track._id ? "text-[var(--accent-blue)]" : "text-[var(--fg)]"}`}>
                                            {track.prompt || "Untitled"}
                                        </p>
                                        <p className="text-[11px] text-[var(--fg-4)]">{formatTime(track.duration)} · {formatDate(track._creationTime)}</p>
                                    </div>
                                    {selected?._id === track._id && <CheckCircle2 size={13} className="text-[var(--accent-blue)] flex-shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Reference audio uploader ─────────────────────────────────────────────────

function ReferenceUploader({ label, placeholder, value, onChange }: {
    label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            onChange(url);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <p className="text-[11px] text-[var(--fg-4)] font-semibold uppercase tracking-widest mb-2">{label}</p>
            {value ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px]">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-blue-light)] border border-[var(--accent-blue-border)] flex items-center justify-center flex-shrink-0">
                        <Mic size={11} className="text-[var(--accent-blue)]" />
                    </div>
                    <p className="text-[12px] text-[var(--fg)] flex-1 truncate">{value.split("/").pop()}</p>
                    <button onClick={() => onChange("")} className="text-[var(--fg-4)] hover:text-red-500 transition-colors">
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    <input
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="input-field text-[12.5px]"
                    />
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-[var(--border)]" />
                        <span className="text-[10px] text-[var(--fg-4)] font-medium uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                    <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="w-full py-2 rounded-[8px] border border-dashed border-[var(--border)] text-[12px] font-medium text-[var(--fg-4)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)] hover:bg-[var(--accent-blue-light)] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {uploading ? "Uploading…" : "Upload audio file"}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Continuation start point picker ─────────────────────────────────────────

function StartPointPicker({ duration, value, onChange, currentTime }: {
    duration: number; value: number; onChange: (v: number) => void; currentTime: number;
}) {
    const barRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);

    const toTime = useCallback((clientX: number) => {
        if (!barRef.current) return 0;
        const r = barRef.current.getBoundingClientRect();
        return Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * duration * 10) / 10;
    }, [duration]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => { if (dragging.current) onChange(toTime(e.clientX)); };
        const onUp = () => { dragging.current = false; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [toTime, onChange]);

    const pct = (s: number) => `${Math.max(0, Math.min(100, (s / duration) * 100))}%`;

    return (
        <div className="space-y-2 select-none">
            <div ref={barRef}
                className="relative h-10 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden cursor-pointer"
                onClick={e => onChange(toTime(e.clientX))}
            >
                <div className="absolute inset-0 flex items-center gap-[2px] px-1">
                    {BARS.map((h, i) => {
                        const t = (i / BARS.length) * duration;
                        return (
                            <div key={i} className="flex-1 rounded-full"
                                style={{ height: `${h * 0.7}%`, background: t < value ? "var(--accent-blue)" : "var(--border-strong)", opacity: t < value ? 0.7 : 0.35 }}
                            />
                        );
                    })}
                </div>
                <div
                    className="absolute top-0 bottom-0 w-[3px] bg-(--accent-blue) cursor-ew-resize z-10"
                    style={{ left: pct(value) }}
                    onMouseDown={e => { e.preventDefault(); dragging.current = true; }}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-5 h-5 bg-(--accent-blue) rounded-full shadow-md border-2 border-white/20" />
                </div>
                {currentTime > 0 && (
                    <div className="absolute top-0 bottom-0 w-px bg-white/50 pointer-events-none" style={{ left: pct(currentTime) }} />
                )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--fg-4)] font-medium">
                <span>0:00</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-blue-light)] border border-[var(--accent-blue-border)] text-[var(--accent-blue)] font-semibold">
                    Continue from {formatTime(value)}
                </span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
}

// ─── Repaint Results Panel ────────────────────────────────────────────────────
// Live Convex query — shows completed / in-progress repaints for selected track.

function RepaintResults({ trackId, onPlay }: {
    trackId: string;
    onPlay: (url: string, label: string) => void;
}) {
    const repaints = useQuery(api.repaints.getRepaintsByTrack, { trackId });

    if (!repaints || repaints.length === 0) return null;

    const taskLabel: Record<string, string> = {
        repaint: "Repaint", continuation: "Continue", remix: "Remix",
        extract: "Extract", cover: "Voice Cover",
    };

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--fg-4)] mb-3">
                Edit History
            </p>
            <div className="flex flex-col gap-2">
                {repaints.map(r => (
                    <div key={r._id}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-[10px] border transition-colors ${r.status === "completed"
                            ? "bg-[var(--surface-2)] border-[var(--border)]"
                            : r.status === "failed"
                                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                                : "bg-[var(--accent-blue-light)] border-[var(--accent-blue-border)]"
                            }`}
                    >
                        {/* Status icon */}
                        <div className="flex-shrink-0">
                            {r.status === "completed"
                                ? <CheckCircle2 size={14} className="text-green-500" />
                                : r.status === "failed"
                                    ? <AlertCircle size={14} className="text-red-500" />
                                    : <Loader2 size={14} className="animate-spin text-[var(--accent-blue)]" />
                            }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold text-[var(--fg)] truncate">
                                {taskLabel[r.taskType] ?? r.taskType}
                                {r.repaintingStart != null && r.repaintingEnd != null && r.repaintingEnd > 0 && (
                                    <span className="font-normal text-[var(--fg-4)] ml-1.5">
                                        {formatTime(r.repaintingStart)}–{formatTime(r.repaintingEnd)}
                                    </span>
                                )}
                            </p>
                            <p className="text-[11px] text-[var(--fg-4)] truncate mt-0.5">{r.prompt}</p>
                            <p className="text-[10px] text-[var(--fg-4)] mt-0.5">{formatRelative(r._creationTime)}</p>
                        </div>

                        {/* Actions */}
                        {r.status === "completed" && r.url && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                    onClick={() => onPlay(r.url!, taskLabel[r.taskType] ?? r.taskType)}
                                    className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--fg-3)] hover:text-[var(--accent-blue)] transition-colors"
                                    title="Play"
                                >
                                    <Play size={11} className="fill-current ml-0.5" />
                                </button>
                                <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--fg-3)] hover:text-[var(--accent-blue)] transition-colors"
                                    title="Open in new tab"
                                >
                                    <ExternalLink size={11} />
                                </a>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EditPage() {
    const { library, activeTrack, setActiveTrack, isPlaying, togglePlayPause, currentTime } = usePlayer();

    const [taskType, setTaskType] = useState<TaskType>("repaint");
    const task = TASKS.find(t => t.id === taskType)!;

    // Source
    const [sourceMode, setSourceMode] = useState<"library" | "upload">("library");
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [uploadedDuration, setUploadedDuration] = useState(30);
    const [uploadedName, setUploadedName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Region / start point
    const [repaintStart, setRepaintStart] = useState(0);
    const [repaintEnd, setRepaintEnd] = useState(15);
    const [continuationStart, setContinuationStart] = useState(0);

    // Params
    const [prompt, setPrompt] = useState("");
    const [lyrics, setLyrics] = useState("[inst]");
    const [referenceUrl, setReferenceUrl] = useState("");
    const [audioCoverStrength, setAudioCoverStrength] = useState(1.0);
    const [coverNoiseStrength, setCoverNoiseStrength] = useState(0.0);
    const [inferStep, setInferStep] = useState(8);
    const [guidanceScale, setGuidanceScale] = useState(15.0);
    const [seed, setSeed] = useState(-1);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [job, setJob] = useState<RepaintJob>({ status: "idle" });

    const srcAudioUrl = sourceMode === "library" ? selectedTrack?.url : uploadedUrl;
    const srcDuration = sourceMode === "library" ? (selectedTrack?.duration ?? 30) : uploadedDuration;

    // trackId for uploaded files: stable string built once per upload
    const uploadedTrackId = useRef<string>(`upload_${Date.now()}`);
    const trackId = sourceMode === "library"
        ? (selectedTrack?._id as string | undefined)
        : uploadedTrackId.current;

    const canSubmit = !!srcAudioUrl
        && (!task.needsPrompt || !!prompt.trim())
        && (!task.needsReference || !!referenceUrl.trim())
        && job.status !== "repainting";

    useEffect(() => {
        setRepaintEnd(Math.min(15, srcDuration));
        setContinuationStart(Math.min(continuationStart, srcDuration));
    }, [srcDuration]);

    useEffect(() => {
        setReferenceUrl("");
        setPrompt("");
    }, [taskType]);

    const handleSelectTrack = (track: Track) => {
        setSelectedTrack(track);
        setActiveTrack(track);
        setContinuationStart(Math.floor(track.duration / 2));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        setUploadedName(file.name);
        // New upload = new stable ID
        uploadedTrackId.current = `upload_${Date.now()}`;
        try {
            const localUrl = URL.createObjectURL(file);
            const audio = new Audio(localUrl);
            await new Promise<void>(res => {
                audio.onloadedmetadata = () => {
                    setUploadedDuration(audio.duration);
                    setContinuationStart(Math.floor(audio.duration / 2));
                    res();
                };
                audio.onerror = () => res();
            });
            URL.revokeObjectURL(localUrl);
            setUploadedUrl(await uploadToCloudinary(file));
        } catch (err: any) {
            setJob({ status: "failed", error: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!canSubmit || !trackId) return;
        setJob({ status: "repainting" });

        try {
            const repaintingStart = task.needsRegion
                ? repaintStart
                : task.id === "continuation"
                    ? continuationStart
                    : 0;

            const repaintingEnd = task.needsRegion
                ? repaintEnd
                : srcDuration;

            if (repaintingStart >= repaintingEnd) {
                setJob({
                    status: "failed",
                    error: `Start (${formatTime(repaintingStart)}) must be before end (${formatTime(repaintingEnd)})`
                });
                return;
            }

            // FIX: use apiTaskType if defined (cover → "cover"), else use task.id
            const apiTaskType = task.apiTaskType ?? task.id;

            const res = await fetch("/api/repaint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trackId,
                    srcAudioUrl,
                    prompt: prompt || task.label,
                    lyrics,
                    repaintingStart,
                    repaintingEnd,
                    taskType: apiTaskType,
                    referenceAudioUrl: referenceUrl || null,
                    audioCoverStrength,
                    coverNoiseStrength,
                    inferStep,
                    guidanceScale,
                    seed,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Failed" }));
                throw new Error(err.error ?? "Failed");
            }

            // API returns 200 immediately — Inngest runs async.
            // Status = "queued" shows the "Queued successfully!" panel.
            setJob({ status: "queued", trackId });
        } catch (err: any) {
            setJob({ status: "failed", error: err.message });
        }
    };

    // Play a repaint result through the global player
    const handlePlayRepaint = useCallback((url: string, label: string) => {
        // Temporarily hijack the player with the repaint URL
        // by creating a fake track object
        const fakeTrack = {
            _id: `repaint_${Date.now()}` as any,
            url,
            prompt: label,
            lyrics: "",
            duration: 0,
            gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            _creationTime: Date.now(),
            status: "completed",
            userId: "",
        };
        setActiveTrack(fakeTrack);
    }, [setActiveTrack]);

    const completedTracks = (library ?? []).filter(t => t.status === "completed" && t.url);

    return (
        <div className="w-full flex flex-col gap-8 pb-32" style={{ fontFamily: "var(--font-inter)" }}>

            {/* Header */}
            <div className="animate-fade-in">
                <h1 className="text-[32px] font-bold tracking-tight text-foreground leading-tight flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-[12px] bg-foreground flex items-center justify-center text-background -rotate-3">
                        <Scissors size={16} strokeWidth={2.5} />
                    </span>
                    Edit
                </h1>
                <p className="text-[15px] text-[var(--fg-3)] font-medium">
                    Transform your tracks with AI-powered editing tools.
                </p>
            </div>

            {/* Step 1: Task Picker */}
            <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--fg-4)] mb-3">Choose Edit Mode</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {TASKS.map(t => {
                        const Icon = t.icon;
                        const selected = taskType === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTaskType(t.id)}
                                className={`flex flex-col items-center gap-2 px-3 py-4 rounded-[12px] border transition-all duration-200 text-center ${selected
                                    ? "border-[var(--accent-blue)] bg-[var(--accent-blue-light)]"
                                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${selected ? "bg-(--accent-blue) text-white" : "bg-[var(--surface-2)] text-[var(--fg-3)]"}`}>
                                    <Icon size={15} />
                                </div>
                                <div>
                                    <p className={`text-[12.5px] font-semibold ${selected ? "text-[var(--accent-blue)]" : "text-[var(--fg)]"}`}>{t.label}</p>
                                    <p className="text-[10.5px] text-[var(--fg-4)] mt-0.5 leading-tight">{t.tagline}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-3 px-4 py-2.5 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] flex items-start gap-2.5">
                    {(() => { const Icon = task.icon; return <Icon size={13} className="text-[var(--accent-blue)] mt-0.5 flex-shrink-0" />; })()}
                    <p className="text-[12.5px] text-[var(--fg-3)] leading-relaxed">{task.description}</p>
                </div>
            </div>

            {/* Main two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

                {/* Left: Source + Controls + Results */}
                <div className="flex flex-col gap-5">

                    {/* Source Audio */}
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--fg-4)] mb-3">Source Audio</p>

                        <div className="flex gap-1.5 mb-4 p-1 bg-[var(--surface-2)] rounded-[8px] border border-[var(--border)]">
                            {(["library", "upload"] as const).map(m => (
                                <button key={m} onClick={() => setSourceMode(m)}
                                    className={`flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all duration-200 ${sourceMode === m ? "bg-[var(--surface)] text-[var(--fg)] shadow-sm" : "text-[var(--fg-4)] hover:text-[var(--fg-3)]"}`}>
                                    {m === "library" ? "Library" : "Upload"}
                                </button>
                            ))}
                        </div>

                        {sourceMode === "library" ? (
                            !library ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin text-[var(--accent-blue)] h-5 w-5" />
                                </div>
                            ) : completedTracks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-2 text-[var(--fg-4)]">
                                    <Music2 size={24} strokeWidth={1.5} />
                                    <p className="text-[13px] font-medium">No tracks yet</p>
                                    <p className="text-[11.5px]">Generate some music first</p>
                                </div>
                            ) : (
                                <TrackPicker
                                    tracks={completedTracks}
                                    selected={selectedTrack}
                                    onSelect={handleSelectTrack}
                                    isPlaying={isPlaying}
                                    activeTrackId={activeTrack?._id}
                                    onTogglePlay={togglePlayPause}
                                />
                            )
                        ) : (
                            <>
                                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
                                {!uploadedUrl ? (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-full h-24 rounded-[10px] border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent-blue)] hover:bg-[var(--accent-blue-light)] transition-all duration-200 flex flex-col items-center justify-center gap-1.5 text-[var(--fg-4)] hover:text-[var(--accent-blue)]"
                                    >
                                        {isUploading
                                            ? <><Loader2 size={18} className="animate-spin" /><span className="text-[12px] font-medium">Uploading…</span></>
                                            : <><Upload size={18} strokeWidth={1.5} /><span className="text-[12px] font-medium">Click to upload</span><span className="text-[11px]">WAV, MP3, FLAC, OGG</span></>
                                        }
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3 px-3.5 py-3 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)]">
                                        <div className="w-8 h-8 rounded-full bg-[var(--accent-blue-light)] border border-[var(--accent-blue-border)] flex items-center justify-center flex-shrink-0">
                                            <Music2 size={14} className="text-[var(--accent-blue)]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12.5px] font-semibold text-[var(--fg)] truncate">{uploadedName}</p>
                                            <p className="text-[11px] text-[var(--fg-4)]">{formatTime(uploadedDuration)} · Uploaded</p>
                                        </div>
                                        <button onClick={() => { setUploadedUrl(null); setUploadedName(""); }}
                                            className="text-[11px] text-[var(--fg-4)] hover:text-red-500 transition-colors font-medium">Remove</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Region selector (repaint) */}
                    {srcAudioUrl && task.needsRegion && (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5 animate-fade-up">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--fg-4)] mb-4">Select Region to Repaint</p>
                            <RegionSelector
                                duration={srcDuration}
                                start={repaintStart}
                                end={repaintEnd}
                                onChange={(s, e) => { setRepaintStart(s); setRepaintEnd(e); }}
                                currentTime={activeTrack?._id === selectedTrack?._id ? currentTime : 0}
                            />
                        </div>
                    )}

                    {/* Start point picker (continuation) */}
                    {srcAudioUrl && task.id === "continuation" && (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5 animate-fade-up">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--fg-4)] mb-4">Start Point</p>
                            <p className="text-[12px] text-[var(--fg-4)] mb-4">Drag to set where the continuation begins.</p>
                            <StartPointPicker
                                duration={srcDuration}
                                value={continuationStart}
                                onChange={setContinuationStart}
                                currentTime={activeTrack?._id === selectedTrack?._id ? currentTime : 0}
                            />
                        </div>
                    )}

                    {/* Live results panel — shows for the current selected track */}
                    {trackId && (
                        <RepaintResults
                            trackId={trackId}
                            onPlay={handlePlayRepaint}
                        />
                    )}
                </div>

                {/* Right: Prompt + Reference + Settings + Submit */}
                <div className="flex flex-col gap-4">

                    {/* Reference audio */}
                    {task.needsReference && (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5">
                            <ReferenceUploader
                                label={task.referenceLabel!}
                                placeholder={task.referencePlaceholder!}
                                value={referenceUrl}
                                onChange={setReferenceUrl}
                            />
                        </div>
                    )}

                    {/* Prompt */}
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--fg-4)] mb-3">
                            {task.id === "cover" ? "Vocal Style" : "Prompt"}
                            {!task.needsPrompt && <span className="ml-1 normal-case font-normal text-[var(--fg-4)]">(optional)</span>}
                        </p>
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder={task.promptPlaceholder}
                            rows={3}
                            className="input-field resize-none text-[13px] leading-relaxed"
                        />

                        {task.id !== "cover" && task.id !== "extract" && (
                            <div className="mt-3">
                                <p className="text-[11px] text-[var(--fg-4)] font-semibold uppercase tracking-widest mb-1.5">
                                    Lyrics <span className="normal-case font-normal">(optional)</span>
                                </p>
                                <input type="text" value={lyrics} onChange={e => setLyrics(e.target.value)}
                                    placeholder="[inst] for instrumental" className="input-field text-[13px]" />
                            </div>
                        )}
                    </div>

                    {/* Advanced */}
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden">
                        <button onClick={() => setShowAdvanced(v => !v)}
                            className="w-full flex items-center justify-between px-5 py-3.5 text-[12px] font-semibold text-[var(--fg-3)] hover:text-[var(--fg)] transition-colors">
                            <span className="flex items-center gap-2"><Zap size={12} />Advanced</span>
                            <ChevronRight size={13} className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : ""}`} />
                        </button>

                        {showAdvanced && (
                            <div className="px-5 pb-5 pt-4 border-t border-[var(--border)] flex flex-col gap-4 animate-fade-up">
                                {["repaint", "remix", "cover"].includes(task.id) && (
                                    <div>
                                        <div className="flex justify-between mb-1.5">
                                            <p className="text-[10.5px] text-[var(--fg-4)] font-semibold uppercase tracking-widest">Cover Strength</p>
                                            <span className="text-[11px] font-bold text-[var(--fg-3)]">{audioCoverStrength.toFixed(1)}</span>
                                        </div>
                                        <input type="range" min={0} max={1} step={0.05} value={audioCoverStrength}
                                            onChange={e => setAudioCoverStrength(parseFloat(e.target.value))}
                                            className="w-full accent-[var(--accent-blue)] h-1" />
                                        <div className="flex justify-between text-[10px] text-[var(--fg-4)] mt-1">
                                            <span>Keep source</span><span>Full repaint</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="flex justify-between mb-1.5">
                                        <p className="text-[10.5px] text-[var(--fg-4)] font-semibold uppercase tracking-widest">Steps</p>
                                        <span className="text-[11px] font-bold text-[var(--fg-3)]">{inferStep}</span>
                                    </div>
                                    {/* Max is 20 now (was incorrectly 8 in the original) */}
                                    <input type="range" min={1} max={20} step={1} value={inferStep}
                                        onChange={e => setInferStep(parseInt(e.target.value))}
                                        className="w-full accent-[var(--accent-blue)] h-1" />
                                    <div className="flex justify-between text-[10px] text-[var(--fg-4)] mt-1">
                                        <span>Fast</span><span>Quality</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1.5">
                                        <p className="text-[10.5px] text-[var(--fg-4)] font-semibold uppercase tracking-widest">Guidance</p>
                                        <span className="text-[11px] font-bold text-[var(--fg-3)]">{guidanceScale.toFixed(0)}</span>
                                    </div>
                                    <input type="range" min={1} max={30} step={1} value={guidanceScale}
                                        onChange={e => setGuidanceScale(parseFloat(e.target.value))}
                                        className="w-full accent-[var(--accent-blue)] h-1" />
                                </div>
                                <div>
                                    <p className="text-[10.5px] text-[var(--fg-4)] font-semibold uppercase tracking-widest mb-1.5">
                                        Seed <span className="normal-case font-normal">(-1 random)</span>
                                    </p>
                                    <input type="number" value={seed} onChange={e => setSeed(parseInt(e.target.value) || -1)}
                                        className="input-field text-[13px]" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit / Status */}
                    {job.status === "idle" || job.status === "failed" ? (
                        <div className="flex flex-col gap-3">
                            {job.status === "failed" && (
                                <div className="flex items-start gap-2.5 px-4 py-3 rounded-[10px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                    <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[12px] font-semibold text-red-600 dark:text-red-400">Failed</p>
                                        <p className="text-[11px] text-red-500/80 mt-0.5">{job.error}</p>
                                    </div>
                                </div>
                            )}

                            <button onClick={handleSubmit} disabled={!canSubmit}
                                className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-[12px] text-[14px] font-semibold transition-all duration-200 ${canSubmit
                                    ? "bg-foreground text-background hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
                                    : "bg-[var(--surface-2)] text-[var(--fg-4)] cursor-not-allowed border border-[var(--border)]"
                                    }`}>
                                <Wand2 size={15} />
                                {job.status === "failed" ? "Try Again" : task.submitLabel}
                            </button>

                            {!srcAudioUrl && (
                                <p className="text-center text-[11.5px] text-[var(--fg-4)]">↑ Select a source track first</p>
                            )}
                            {srcAudioUrl && task.needsReference && !referenceUrl && (
                                <p className="text-center text-[11.5px] text-[var(--fg-4)]">↑ Add a reference audio file</p>
                            )}
                            {srcAudioUrl && task.needsPrompt && !prompt.trim() && (
                                <p className="text-center text-[11.5px] text-[var(--fg-4)]">↑ Enter a prompt to continue</p>
                            )}
                        </div>
                    ) : job.status === "repainting" ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5 flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2.5">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className="wave-bar" style={{ height: "24px", animationDelay: `${i * 150}ms` }} />
                                ))}
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] font-semibold text-[var(--fg)]">{task.label} in progress…</p>
                                <p className="text-[11.5px] text-[var(--fg-4)] mt-0.5">Submitting to queue…</p>
                            </div>
                        </div>
                    ) : (
                        /* job.status === "queued" */
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5 flex flex-col gap-3">
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 size={15} className="text-green-500" />
                                <p className="text-[13px] font-semibold text-[var(--fg)]">Queued successfully!</p>
                            </div>
                            <p className="text-[11.5px] text-[var(--fg-4)]">
                                Your edited track will appear in Edit History below once it's ready. This usually takes 30–90 seconds.
                            </p>
                            <button onClick={() => setJob({ status: "idle" })}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] text-[12.5px] font-semibold text-[var(--fg-3)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-all duration-200">
                                <RefreshCw size={12} />
                                Edit Another Track
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}