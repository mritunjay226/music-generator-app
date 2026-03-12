"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { TrackCard } from "@/components/library/TrackCard";
import { LoadingTrackCard } from "@/components/library/LoadingTrackCard";
import { EmptyLibrary } from "@/components/library/EmptyLibrary";
import { Loader2 } from "lucide-react";

export default function LibraryPage() {
    const { library, activeTrack, setActiveTrack, isPlaying, togglePlayPause } = usePlayer();

    if (library === undefined) {
        return (
            <div className="w-full flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-500 h-8 w-8" />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-10 pb-30" style={{ fontFamily: "var(--font-inter)" }}>
            {/* Page Header */}
            <div className="flex justify-between items-end animate-fade-in">
                <div className="flex flex-col gap-2">
                    <h1 className="text-[32px] font-bold tracking-tight text-foreground leading-tight flex items-center gap-3">
                        <span className="w-8 h-8 rounded-[12px] bg-foreground flex items-center justify-center text-background transform rotate-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                        </span>
                        Library
                    </h1>
                    <p className="text-[15px] text-(--fg-3) font-medium max-w-lg">
                        Your generated tracks, stored and ready to stream.
                    </p>
                </div>
                {library?.length > 0 && (
                    <div className="px-3.5 py-1.5 rounded-full bg-(--surface-2) border border-(--border) text-[12px] font-bold text-(--fg-3) uppercase tracking-widest">
                        {library?.length} {library?.length !== 1 ? "Tracks" : "Track"}
                    </div>
                )}
            </div>

            {library?.length === 0 ? (
                <EmptyLibrary />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
                    {library?.map((track) => {
                        if (track.status === "generating") {
                            return (
                                <LoadingTrackCard
                                    key={track._id}
                                    prompt={track.prompt}
                                    duration={track.duration}
                                    createdAt={track._creationTime}
                                />
                            );
                        }

                        return (
                            <TrackCard
                                key={track._id}
                                track={track}
                                isActive={activeTrack?._id === track._id}
                                isPlaying={isPlaying}
                                onPlay={setActiveTrack}
                                onTogglePlayPause={togglePlayPause}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
