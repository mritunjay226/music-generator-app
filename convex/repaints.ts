// convex/repaints.ts — NEW FILE, create this alongside convex/tracks.ts
// Mirrors the internal mutation pattern from tracks.ts
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Called by Inngest via /inngest_save_repaint when Modal finishes
export const saveRepaintInternal = internalMutation({
    args: {
        trackId:        v.string(),
        url:            v.string(),
        duration:       v.optional(v.number()),
        seed:           v.optional(v.number()),
        repaintingStart: v.number(),
        repaintingEnd:  v.number(),
        taskType:       v.string(),
    },
    handler: async (ctx, args) => {
        // Find the repaint row that is "repainting" for this trackId
        const existing = await ctx.db
            .query("repaints")
            .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
            .filter((q) => q.eq(q.field("status"), "repainting"))
            .first();

        if (!existing) {
            console.error(`saveRepaintInternal: no repainting row found for trackId ${args.trackId}`);
            return;
        }

        await ctx.db.patch(existing._id, {
            url:            args.url,
            duration:       args.duration,
            seed:           args.seed,
            repaintingStart: args.repaintingStart,
            repaintingEnd:  args.repaintingEnd,
            taskType:       args.taskType,
            status:         "completed",
        });
    },
});

// Called by Inngest via /inngest_fail_repaint on error
export const failRepaintInternal = internalMutation({
    args: { trackId: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("repaints")
            .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
            .filter((q) => q.eq(q.field("status"), "repainting"))
            .first();

        if (!existing) return;

        await ctx.db.patch(existing._id, { status: "failed" });
    },
});

// Called from the Next.js /api/repaint route to create the initial row
export const createRepaint = internalMutation({
    args: {
        userId:         v.string(),
        trackId:        v.string(),
        srcAudioUrl:    v.string(),
        prompt:         v.string(),
        lyrics:         v.string(),
        taskType:       v.string(),
        repaintingStart: v.number(),
        repaintingEnd:  v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("repaints", {
            userId:         args.userId,
            trackId:        args.trackId,
            srcAudioUrl:    args.srcAudioUrl,
            prompt:         args.prompt,
            lyrics:         args.lyrics,
            taskType:       args.taskType,
            repaintingStart: args.repaintingStart,
            repaintingEnd:  args.repaintingEnd,
            status:         "repainting",
        });
    },
});

// Query — fetch all repaints for a given track (used in the Edit UI)
export const getRepaintsByTrack = query({
    args: { trackId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("repaints")
            .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
            .order("desc")
            .collect();
    },
});

// Query — fetch all repaints for the current user
export const getRepaintsByUser = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("repaints")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});