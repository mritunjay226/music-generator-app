import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncUser = mutation({
    args: {
        userId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (existingUser) {
            // Keep profile data fresh on every sign-in
            await ctx.db.patch(existingUser._id, {
                email: args.email,
                name: args.name,
                imageUrl: args.imageUrl,
            });
            return existingUser._id;
        }

        return await ctx.db.insert("users", {
            userId: args.userId,
            email: args.email,
            name: args.name,
            imageUrl: args.imageUrl,
        });
    },
});

export const getCurrentUser = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();
    },
});
