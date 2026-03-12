"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GeneratorForm } from "@/components/GeneratorForm";
import { usePlayer } from "@/contexts/PlayerContext";
import { getRandomGradient } from "@/lib/music";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function DashboardPage() {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Connect to the global audio persistent state
    const { setActiveTrack } = usePlayer();
    const createPendingTrack = useMutation(api.tracks.createPendingTrack);

    const handleGenerate = async (prompt: string, lyrics: string, duration: number) => {
        // Basic validation
        if (!prompt) return;

        setIsGenerating(true);
        setError(null); // Clear previous errors

        try {
            // 1. Optimistically create the track in Convex as "generating"
            const gradient = getRandomGradient();
            const trackId = await createPendingTrack({
                prompt,
                lyrics,
                duration,
                gradient,
            });

            // 2. Trigger the Inngest background job through our secure Next.js route handler
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt,
                    lyrics,
                    duration,
                    trackId, // Pass the newly created ID to the background worker
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            // 3. Navigate the user directly to the library to see the loading state
            router.push("/dashboard/library");

        } catch (err: any) {
            setError(err.message || "An error occurred");
            setIsGenerating(false); // Only toggle false on error since we redirect on success
        }
    };

    return (
        <div className="w-full flex flex-col gap-10 pb-10 animate-fade-up" style={{ fontFamily: "var(--font-inter)" }}>
            <div className="flex flex-col gap-2">
                <h1 className="text-[32px] font-bold tracking-tight text-foreground leading-tight flex items-center gap-3">
                    <span className="w-8 h-8 rounded-[12px] bg-foreground flex items-center justify-center text-background">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    </span>
                    <span>Studio</span>
                </h1>
                <p className="text-[15px] text-(--fg-3) font-medium max-w-lg">
                    Describe your sound and let the AI compose it instantly. Every generated track is unique and royalty-free.
                </p>
            </div>

            <GeneratorForm onGenerate={handleGenerate} isGenerating={isGenerating} />

            {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 text-red-600 rounded-[12px] text-[13px]">
                    {error}
                </div>
            )}
        </div>
    );
}
