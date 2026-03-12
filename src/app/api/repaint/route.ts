// app/api/repaint/route.ts
import { auth } from "@clerk/nextjs/server";
import { inngest } from "../../../inngest/client";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const {
            trackId,           // Convex track ID to update when done
            srcAudioUrl,       // Cloudinary URL of audio to edit
            prompt,            // Description for the repainted section
            lyrics,            // Optional lyrics, defaults to "[inst]"
            repaintingStart,   // Start of section in seconds
            repaintingEnd,     // End of section in seconds (null = end of file)
            taskType,          // "repaint" | "continuation" | "remix" | "extract"
            referenceAudioUrl, // Optional style reference (remix/extract)
            audioCoverStrength,
            coverNoiseStrength,
            inferStep,
            guidanceScale,
            seed,
            bpm,
            key,
            language,
            inferMethod,
            cfgIntervalStart,
            cfgIntervalEnd,
            shift,
            useAdg,
            outputFormat,
        } = body;

        if (!trackId || !srcAudioUrl || !prompt) {
            return new Response(
                JSON.stringify({ error: "trackId, srcAudioUrl and prompt are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        await inngest.send({
            name: "app/music.repaint",
            data: {
                trackId,
                srcAudioUrl,
                prompt,
                lyrics,
                repaintingStart:   repaintingStart   ?? 0.0,
                repaintingEnd:     repaintingEnd      ?? null,
                taskType:          taskType           ?? "repaint",
                referenceAudioUrl: referenceAudioUrl  ?? null,
                audioCoverStrength: audioCoverStrength ?? 1.0,
                coverNoiseStrength: coverNoiseStrength ?? 0.0,
                inferStep:         inferStep          ?? 8,
                guidanceScale:     guidanceScale      ?? 15.0,
                seed:              seed               ?? -1,
                bpm:               bpm                ?? "",
                key:               key                ?? "",
                language:          language           ?? "en",
                inferMethod:       inferMethod        ?? "ode",
                cfgIntervalStart:  cfgIntervalStart   ?? 0.0,
                cfgIntervalEnd:    cfgIntervalEnd     ?? 1.0,
                shift:             shift              ?? 1.0,
                useAdg:            useAdg             ?? false,
                outputFormat:      outputFormat       ?? "wav",
            },
        });

        return new Response(
            JSON.stringify({ success: true, message: "Repaint started in background" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Repaint API Route Error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Something went wrong" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}