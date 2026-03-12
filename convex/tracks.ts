import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const createPendingTrack = mutation({
    args: {
        prompt: v.string(),
        lyrics: v.string(),
        duration: v.number(),
        gradient: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated call to createPendingTrack");

        const trackId = await ctx.db.insert("tracks", {
            userId: identity.subject,
            prompt: args.prompt,
            lyrics: args.lyrics,
            duration: args.duration,
            gradient: args.gradient,
            status: "generating",
        });

        await ctx.scheduler.runAfter(0, internal.apiKeys.logDashboardUsage, {
            userId: identity.subject,
            action: "generate_track",
            creditsUsed: Math.ceil(args.duration / 30),
        });

        return trackId;
    },
});

export const saveTrackInternal = internalMutation({
    args: {
        trackId: v.id("tracks"),
        url: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.trackId, {
            url: args.url,
            status: "completed",
        });
        return args.trackId;
    },
});

// Called by Inngest after thumbnail is generated and uploaded to Cloudinary
export const saveThumbnailInternal = internalMutation({
    args: {
        trackId: v.id("tracks"),
        thumbnailUrl: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.trackId, {
            thumbnailUrl: args.thumbnailUrl,
        });
        return args.trackId;
    },
});

export const failTrackInternal = internalMutation({
    args: {
        trackId: v.id("tracks"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.trackId, { status: "failed" });
        return args.trackId;
    },
});

export const deleteTrack = mutation({
    args: { trackId: v.id("tracks") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");
        const track = await ctx.db.get(args.trackId);
        if (!track || track.userId !== identity.subject)
            throw new Error("Unauthorized: track not found or not owned by user");
        await ctx.db.delete(args.trackId);
    },
});

export const getTracks = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return undefined;
        return await ctx.db
            .query("tracks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .order("desc")
            .collect();
    },
});