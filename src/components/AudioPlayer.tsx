"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, DownloadCloud, Music2 } from "lucide-react";
import { Button } from "./Button";

interface AudioPlayerProps {
    audioUrl: string;
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!audioUrl || !containerRef.current) return;

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: "#D1D5DB", // neutral-300
            progressColor: "#2563EB", // blue-600
            cursorColor: "#1D4ED8", // blue-700
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            height: 48,
            normalize: true,
            cursorWidth: 2,
        });

        wavesurfer.current.load(audioUrl);

        wavesurfer.current.on("ready", () => {
            setIsReady(true);
            wavesurfer.current?.play();
        });

        wavesurfer.current.on("play", () => setIsPlaying(true));
        wavesurfer.current.on("pause", () => setIsPlaying(false));
        wavesurfer.current.on("finish", () => setIsPlaying(false));

        return () => {
            wavesurfer.current?.destroy();
        };
    }, [audioUrl]);

    const togglePlay = () => {
        wavesurfer.current?.playPause();
    };

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm dark:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-5">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Music2 size={16} />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-[var(--fg)] leading-tight">
                        Generated Track
                    </h3>
                    <p className="text-xs text-[var(--fg-3)]">
                        {isReady ? "Ready to play" : "Loading audio..."}
                    </p>
                </div>
            </div>

            <div className="bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border)] mb-5">
                <div ref={containerRef} className="w-full" />
            </div>

            <div className="flex items-center justify-between">
                <button
                    onClick={togglePlay}
                    disabled={!isReady}
                    className="flex items-center justify-center w-10 h-10 bg-foreground hover:bg-[var(--fg-2)] text-background rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPlaying ? (
                        <Pause size={18} className="fill-current" />
                    ) : (
                        <Play size={18} className="fill-current ml-1" />
                    )}
                </button>

                <a
                    href={audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                >
                    <Button variant="outline" size="sm" className="gap-2 font-semibold">
                        <DownloadCloud size={16} />
                        Download
                    </Button>
                </a>
            </div>
        </div>
    );
}
