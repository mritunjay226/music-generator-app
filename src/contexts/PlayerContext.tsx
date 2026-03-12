"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface Track {
    _id: Id<"tracks">;
    url?: string;
    prompt: string;
    lyrics: string;
    duration: number;
    gradient: string;
    _creationTime: number;
    status?: string;
    userId: string;
    thumbnailUrl?: string;
}

interface PlayerContextType {
    library: Track[] | undefined;
    activeTrack: Track | null;
    setActiveTrack: (track: Track | null) => void;
    isPlaying: boolean;
    togglePlayPause: () => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    currentTime: number;
    duration: number;
    seekTo: (time: number) => void;
    isLooping: boolean;
    toggleLoop: () => void;
    playNext: () => void;
    playPrev: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const rawLibrary = useQuery(api.tracks.getTracks);

    // undefined = still loading (convex or auth not ready) → show spinner
    // Track[]   = loaded
    const library = useMemo<Track[] | undefined>(() => {
        if (rawLibrary === undefined || rawLibrary === null) return undefined;
        return rawLibrary;
    }, [rawLibrary]);

    const [activeTrack, setActiveTrackState] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying]         = useState(false);
    const [currentTime, setCurrentTime]     = useState(0);
    const [duration, setDuration]           = useState(0);
    const [isLooping, setIsLooping]         = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);

    // Stable ref so audio event callbacks never go stale
    const isLoopingRef = useRef(isLooping);
    useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);

    const playableTracks = useMemo(
        () => (library ?? []).filter(t => t.status === "completed" && t.url),
        [library]
    );

    const setActiveTrack = useCallback((track: Track | null) => {
        setActiveTrackState(track);
        setCurrentTime(0);
        setDuration(0);
    }, []);

    const togglePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            audio.play().catch(console.error);
        } else {
            audio.pause();
        }
    }, []); // no deps — reads from audio element directly, never stale

    const seekTo = useCallback((time: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = time;
        setCurrentTime(time);
    }, []);

    const toggleLoop = useCallback(() => {
        setIsLooping(prev => {
            const next = !prev;
            if (audioRef.current) audioRef.current.loop = next;
            return next;
        });
    }, []);

    // Use refs for playNext/playPrev so the callbacks are always stable
    const playableTracksRef = useRef(playableTracks);
    useEffect(() => { playableTracksRef.current = playableTracks; }, [playableTracks]);

    const activeTrackRef = useRef(activeTrack);
    useEffect(() => { activeTrackRef.current = activeTrack; }, [activeTrack]);

    const playNext = useCallback(() => {
        const tracks = playableTracksRef.current;
        const current = activeTrackRef.current;
        if (!current || tracks.length === 0) return;
        const idx = tracks.findIndex(t => t._id === current._id);
        const next = tracks[(idx + 1) % tracks.length];
        if (next) setActiveTrack(next);
    }, [setActiveTrack]);

    const playPrev = useCallback(() => {
        const tracks = playableTracksRef.current;
        const current = activeTrackRef.current;
        if (!current || tracks.length === 0) return;
        const idx = tracks.findIndex(t => t._id === current._id);
        const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
        if (prev) setActiveTrack(prev);
    }, [setActiveTrack]);

    // Wire up audio element events — once on mount, never re-runs
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate     = () => setCurrentTime(audio.currentTime);
        const onPlay           = () => setIsPlaying(true);
        const onPause          = () => setIsPlaying(false);
        const onDurationChange = () => {
            if (!isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };
        const onLoadedMetadata = () => {
            audio.currentTime = 0;
            setCurrentTime(0);
            if (!isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        audio.addEventListener("timeupdate",     onTimeUpdate);
        audio.addEventListener("play",           onPlay);
        audio.addEventListener("pause",          onPause);
        audio.addEventListener("ended",          onEnded);
        audio.addEventListener("durationchange", onDurationChange);
        audio.addEventListener("loadedmetadata", onLoadedMetadata);

        return () => {
            audio.removeEventListener("timeupdate",     onTimeUpdate);
            audio.removeEventListener("play",           onPlay);
            audio.removeEventListener("pause",          onPause);
            audio.removeEventListener("ended",          onEnded);
            audio.removeEventListener("durationchange", onDurationChange);
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        };
    }, []); // empty — audio element is stable, events never need re-wiring

    // Load + play when active track changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (activeTrack?.url) {
            audio.src  = activeTrack.url;
            audio.loop = isLoopingRef.current;
            audio.load();
            audio.play().catch(console.error);
        } else {
            audio.pause();
            audio.src = "";
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
        }
    }, [activeTrack?._id]); // only fires when track ID changes

    return (
        <PlayerContext.Provider value={{
            library,
            activeTrack,
            setActiveTrack,
            isPlaying,
            togglePlayPause,
            audioRef,
            currentTime,
            duration,
            seekTo,
            isLooping,
            toggleLoop,
            playNext,
            playPrev,
        }}>
            {children}
            <audio ref={audioRef} className="hidden" />
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (ctx === undefined) throw new Error("usePlayer must be used within a PlayerProvider");
    return ctx;
}