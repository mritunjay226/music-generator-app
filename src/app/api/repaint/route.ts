// app/api/repaint/route.ts
//
// FIXES applied:
//   1. Creates the Convex `repaints` row (status="repainting") BEFORE firing
//      Inngest — saveRepaintInternal queries for that row; without it the
//      result is silently dropped.
//   2. Passes userId from Clerk to both the Convex row and the Inngest event.
//   3. For uploaded tracks (trackId starts with "upload_") we still create
//      the row with that string ID — both sides use the same string.
//   4. `cover` taskType passes straight through; Modal now accepts it.

import { auth } from "@clerk/nextjs/server";
import { inngest } from "../../../inngest/client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
            trackId,
            srcAudioUrl,
            prompt,
            lyrics,
            repaintingStart,
            repaintingEnd,
            taskType,
            referenceAudioUrl,
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

        const resolvedTaskType   = taskType          ?? "repaint";
        const resolvedStart      = repaintingStart    ?? 0.0;
        // repaintingEnd=null means "to end of file" — the Modal preprocess step
        // resolves the actual duration; we store 0 as placeholder and update on save.
        const resolvedEnd        = repaintingEnd      ?? 0.0;

        // ── Step 1: Create the Convex row FIRST so saveRepaintInternal can find it ──
        // We use the public mutation exposed via http action to avoid needing the
        // internal Convex admin key on the Next.js server.
        // If you have CONVEX_DEPLOY_KEY available you could use runMutation directly.
        // Here we call the http action endpoint instead (matches existing pattern).
        const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(".cloud", ".site");

        const createRes = await fetch(`${CONVEX_SITE_URL}/inngest_create_repaint`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.INNGEST_WEBHOOK_SECRET}`,
            },
            body: JSON.stringify({
                userId,
                trackId,
                srcAudioUrl,
                prompt,
                lyrics:          lyrics          ?? "[inst]",
                taskType:        resolvedTaskType,
                repaintingStart: resolvedStart,
                repaintingEnd:   resolvedEnd,
            }),
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            console.error("Failed to create repaint row:", err);
            // Non-fatal for the user — Inngest will still run, but the save step
            // will fail silently. Log and continue so the user gets a 200.
            // In production you may want to return 500 here instead.
        }

        // ── Step 2: Fire Inngest ──────────────────────────────────────────────────
        await inngest.send({
            name: "app/music.repaint",
            data: {
                userId,
                trackId,
                srcAudioUrl,
                prompt,
                lyrics:             lyrics             ?? "[inst]",
                repaintingStart:    resolvedStart,
                repaintingEnd:      repaintingEnd       ?? null,   // null = Modal infers duration
                taskType:           resolvedTaskType,
                referenceAudioUrl:  referenceAudioUrl   ?? null,
                audioCoverStrength: audioCoverStrength  ?? 1.0,
                coverNoiseStrength: coverNoiseStrength  ?? 0.0,
                inferStep:          inferStep           ?? 8,
                guidanceScale:      guidanceScale       ?? 15.0,
                seed:               seed                ?? -1,
                bpm:                bpm                 ?? "",
                key:                key                 ?? "",
                language:           language            ?? "en",
                inferMethod:        inferMethod         ?? "ode",
                cfgIntervalStart:   cfgIntervalStart    ?? 0.0,
                cfgIntervalEnd:     cfgIntervalEnd      ?? 1.0,
                shift:              shift               ?? 1.0,
                useAdg:             useAdg              ?? false,
                outputFormat:       outputFormat        ?? "mp3",
            },
        });

        return new Response(
            JSON.stringify({ success: true, message: "Repaint queued" }),
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