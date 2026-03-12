import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// ─────────────────────────────────────────────────────────────────────────────
// Shared auth helper for Inngest webhook calls
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

/** SHA-256 a string, return hex digest */
async function sha256Hex(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// Inngest webhook routes
// ─────────────────────────────────────────────────────────────────────────────

http.route({
    path: "/inngest_save_track",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { trackId, url } = body;

        await ctx.runMutation(internal.tracks.saveTrackInternal, {
            trackId,
            url,
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

http.route({
    path: "/inngest_fail_track",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { trackId } = body;

        await ctx.runMutation(internal.tracks.failTrackInternal, { trackId });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

// convex/http.ts — ADD this route after inngest_fail_track, before inngest_save_repaint

http.route({
    path: "/inngest_save_thumbnail",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { trackId, thumbnailUrl } = body;

        await ctx.runMutation(internal.tracks.saveThumbnailInternal, {
            trackId,
            thumbnailUrl,
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

http.route({
    path: "/inngest_save_repaint",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const {
            trackId,
            url,
            duration,
            seed,
            repaintingStart,
            repaintingEnd,
            taskType,
        } = body;

        await ctx.runMutation(internal.repaints.saveRepaintInternal, {
            trackId,
            url,
            duration,
            seed,
            repaintingStart,
            repaintingEnd,
            taskType,
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

http.route({
    path: "/inngest_fail_repaint",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        if (!verifyWebhookAuth(request)) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { trackId } = body;

        await ctx.runMutation(internal.repaints.failRepaintInternal, { trackId });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});


// ─────────────────────────────────────────────────────────────────────────────
// Public API key validation endpoint
// Used by developers to verify keys from their own apps.
// ─────────────────────────────────────────────────────────────────────────────

http.route({
    path: "/validate_api_key",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        // CORS preflight
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
            "Content-Type": "application/json",
        };

        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ace_sk_")) {
            return new Response(
                JSON.stringify({ valid: false, error: "Missing or malformed Authorization header. Expected: Bearer ace_sk_..." }),
                { status: 401, headers: corsHeaders }
            );
        }

        const rawKey = authHeader.slice(7); // strip "Bearer "
        const keyHash = await sha256Hex(rawKey);

        const result = await ctx.runQuery(internal.apiKeys.validateApiKeyInternal, { keyHash });

        if (!result) {
            return new Response(
                JSON.stringify({ valid: false, error: "Invalid or revoked API key" }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Record usage
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

// Handle CORS preflight for /validate_api_key
http.route({
    path: "/validate_api_key",
    method: "OPTIONS",
    handler: httpAction(async (_ctx, _request) => {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
            },
        });
    }),
});

export default http;
