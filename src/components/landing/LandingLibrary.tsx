"use client";

import { Play, Pause, Clock } from "lucide-react";
import { LANDING_DEMO_TRACKS } from "@/lib/constants";
import { usePlayer, Track } from "@/contexts/PlayerContext";

export function LandingLibrary() {
    const { activeTrack, isPlaying, setActiveTrack, togglePlayPause } = usePlayer();

    const handleTrackClick = (demoTrack: typeof LANDING_DEMO_TRACKS[0]) => {
        if (activeTrack?._id === demoTrack.id) {
            // Toggle play/pause if clicking the same track
            togglePlayPause();
        } else {
            // Transform the static demo track to match the context Track interface
            const newTrack: Track = {
                _id: demoTrack.id as unknown as import("../../../convex/_generated/dataModel").Id<"tracks">,
                url: demoTrack.url,
                prompt: demoTrack.title,
                lyrics: demoTrack.prompt,
                duration: 0,
                gradient: demoTrack.gradient,
                _creationTime: Date.now(),
                status: 'completed',
                userId: 'demo',
            };
            setActiveTrack(newTrack);
        }
    };

    return (
        <section id="library-preview" className="w-full max-w-6xl mx-auto px-6 lg:px-16 pb-28 relative">
            <div className="text-center mb-14">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-(--fg-4) mb-4">
                    Discover
                </p>
                <h2
                    className="text-[clamp(2rem,4.5vw,3.2rem)] font-light leading-[1.1] tracking-[-0.025em] text-foreground mb-4"
                    style={{ fontFamily: "var(--font-serif)" }}
                >
                    Hear the impossible.
                </h2>
                <p className="text-[16px] text-[#5a5a54] dark:text-(--fg-3) max-w-xl mx-auto leading-relaxed">
                    Explore tracks generated entirely by text prompts. No samples, no loops. Pure synthesis.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                {LANDING_DEMO_TRACKS.map((track) => {
                    const isTrackActive = activeTrack?._id === track.id;
                    const isTrackPlaying = isTrackActive && isPlaying;

                    return (
                        <div
                            key={track.id}
                            onClick={() => handleTrackClick(track)}
                            className={`group relative flex items-center gap-5 bg-(--surface) shadow-sm dark:shadow-none hover:bg-(--surface-2) rounded-[16px] p-3 transition-colors duration-200 cursor-pointer ${isTrackActive ? "ring-1 ring-black/10 dark:ring-white/10" : ""
                                }`}
                        >
                            <div
                                className="relative shrink-0 w-[60px] h-[60px] rounded-full shadow-[0_8px_24px_rgba(17,17,16,0.15),0_2px_8px_rgba(17,17,16,0.1)] overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                                style={{ background: track.gradient }}
                            >
                                <div className="absolute inset-0 rounded-full border border-white/10 shadow-[inset_0_4px_14px_rgba(255,255,255,0.2),inset_0_-4px_14px_rgba(0,0,0,0.5)] pointer-events-none" />
                                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15)_0%,transparent_60%)] pointer-events-none" />

                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18px] h-[18px] bg-background rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] z-10 flex items-center justify-center">
                                    <div className={`w-2 h-2 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)] ${isTrackPlaying ? "bg-red-500 animate-pulse" : "bg-foreground"}`} />
                                </div>

                                <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 z-20 ${isTrackActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                    <div className="w-[30px] h-[30px] bg-white rounded-full flex items-center justify-center text-black shadow-[0_4px_12px_rgba(17,17,16,0.3)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                        {isTrackPlaying ? (
                                            <Pause size={14} className="fill-current" />
                                        ) : (
                                            <Play size={14} className="fill-current ml-0.5" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className="text-[15px] font-semibold text-foreground truncate">{track.title}</h4>
                                <p className="text-[12px] font-medium text-(--fg-4) truncate mt-0.5 mb-1 flex items-center gap-1.5"><Clock size={11} /> {track.duration} <span className="mx-1.5 opacity-50">&bull;</span> <Play size={11} /> {track.plays}</p>
                                <p className="text-[13px] text-(--fg-3) leading-[1.4] line-clamp-1 italic">
                                    "{track.prompt}"
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
