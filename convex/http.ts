// convex/http.ts — full replacement
//
// ADDED: /inngest_create_repaint — called by the Next.js API route BEFORE
// firing Inngest, so saveRepaintInternal can find the row when Modal finishes.

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// ─────────────────────────────────────────────────────────────────────────────
// Shared auth helper
// ─────────────────────────────────────────────────────────────────────────────

function verifyWebhookAuth(request: Request): boolean {
    const authHeader = request.headers.get("Authorization");
    const expectedKey = `Bearer ${process.env.INNGEST_WEBHOOK_SECRET}`;
    if (!authHeader || authHeader !== expectedKey) {
        console.error("Inngest Webhook Auth Failed. Got:", authHeader);
        return false;
    }
    return true;
}

async function sha256Hex(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// Track routes
// ─────────────────────────────────────────────────────────────────────────────

http.route({
    path: "/inngest_save_track",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) return new Response("Unauthorized", { status: 401 });
        const { trackId, url } = await request.json();
        await ctx.runMutation(internal.tracks.saveTrackInternal, { trackId, url });
        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { "Content-Type": "application/json" },
        });
    }),
});

http.route({
    path: "/inngest_fail_track",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) return new Response("Unauthorized", { status: 401 });
        const { trackId } = await request.json();
        await ctx.runMutation(internal.tracks.failTrackInternal, { trackId });
        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { "Content-Type": "application/json" },
        });
    }),
});

http.route({
    path: "/inngest_save_thumbnail",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) return new Response("Unauthorized", { status: 401 });
        const { trackId, thumbnailUrl } = await request.json();
        await ctx.runMutation(internal.tracks.saveThumbnailInternal, { trackId, thumbnailUrl });
        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { "Content-Type": "application/json" },
        });
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Repaint routes
// ─────────────────────────────────────────────────────────────────────────────

// NEW — called by /api/repaint BEFORE Inngest fires so the row exists
// when saveRepaintInternal runs.
http.route({
    path: "/inngest_create_repaint",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) return new Response("Unauthorized", { status: 401 });
        const {
            userId,
            trackId,
            srcAudioUrl,
            prompt,
            lyrics,
            taskType,
            repaintingStart,
            repaintingEnd,
        } = await request.json();
        await ctx.runMutation(internal.repaints.createRepaint, {
            userId,
            trackId,
            srcAudioUrl,
            prompt,
            lyrics:          lyrics          ?? "[inst]",
            taskType:        taskType        ?? "repaint",
            repaintingStart: repaintingStart ?? 0,
            repaintingEnd:   repaintingEnd   ?? 0,
        });
        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { "Content-Type": "application/json" },
        });
    }),
});

http.route({
    path: "/inngest_save_repaint",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) return new Response("Unauthorized", { status: 401 });
        const {
            trackId, url, duration, seed, repaintingStart, repaintingEnd, taskType,
        } = await request.json();
        await ctx.runMutation(internal.repaints.saveRepaintInternal, {
            trackId, url, duration, seed, repaintingStart, repaintingEnd, taskType,
        });
        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { "Content-Type": "application/json" },
        });
    }),
});

http.route({
    path: "/inngest_fail_repaint",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) return new Response("Unauthorized", { status: 401 });
        const { trackId } = await request.json();
        await ctx.runMutation(internal.repaints.failRepaintInternal, { trackId });
        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { "Content-Type": "application/json" },
        });
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Public API key validation
// ─────────────────────────────────────────────────────────────────────────────

http.route({
    path: "/validate_api_key",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
            "Content-Type": "application/json",
        };

        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ace_sk_")) {
            return new Response(
                JSON.stringify({ valid: false, error: "Missing or malformed Authorization header." }),
                { status: 401, headers: corsHeaders }
            );
        }

        const rawKey  = authHeader.slice(7);
        const keyHash = await sha256Hex(rawKey);
        const result  = await ctx.runQuery(internal.apiKeys.validateApiKeyInternal, { keyHash });

        if (!result) {
            return new Response(
                JSON.stringify({ valid: false, error: "Invalid or revoked API key" }),
                { status: 401, headers: corsHeaders }
            );
        }

        await ctx.runMutation(internal.apiKeys.touchApiKeyInternal, {
            apiKeyId: result.apiKeyId,
            userId: result.userId,
            action: "api_validate",
            creditsUsed: 0,
        });

        return new Response(
            JSON.stringify({ valid: true, userId: result.userId }),
            { status: 200, headers: corsHeaders }
        );
    }),
});

http.route({
    path: "/validate_api_key",
    method: "OPTIONS",
    handler: httpAction(async () =>
        new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
            },
        })
    ),
});

export default http;