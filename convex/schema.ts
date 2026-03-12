import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tracks: defineTable({
        userId: v.string(),
        prompt: v.string(),
        lyrics: v.string(),
        duration: v.number(),
        url: v.optional(v.string()),
        gradient: v.string(),
        status: v.optional(v.string()),       // "generating" | "completed" | "failed"
        thumbnailUrl: v.optional(v.string()), // Cloudinary URL of AI-generated thumbnail
    }).index("by_user", ["userId"]),

    repaints: defineTable({
        userId: v.string(),
        trackId: v.string(),
        srcAudioUrl: v.string(),
        url: v.optional(v.string()),
        prompt: v.string(),
        lyrics: v.string(),
        taskType: v.string(),
        repaintingStart: v.number(),
        repaintingEnd: v.number(),
        duration: v.optional(v.number()),
        seed: v.optional(v.number()),
        status: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_track", ["trackId"]),

    users: defineTable({
        userId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
    }).index("by_userId", ["userId"]),

    subscriptions: defineTable({
        userId: v.string(),
        stripeCustomerId: v.optional(v.string()),
        stripeSubscriptionId: v.optional(v.string()),
        tier: v.string(),
        status: v.string(),
        currentPeriodEnd: v.optional(v.number()),
    })
        .index("by_userId", ["userId"])
        .index("by_stripeCustomerId", ["stripeCustomerId"]),

    apiKeys: defineTable({
        userId: v.string(),
        name: v.string(),
        keyHash: v.string(),
        prefix: v.string(),
        status: v.string(),
        createdAt: v.number(),
        lastUsedAt: v.optional(v.number()),
    })
        .index("by_userId", ["userId"])
        .index("by_keyHash", ["keyHash"]),

    usageLogs: defineTable({
        userId: v.string(),
        apiKeyId: v.optional(v.id("apiKeys")),
        action: v.string(),
        creditsUsed: v.number(),
        timestamp: v.number(),
        metadata: v.optional(v.string()),
    })
        .index("by_userId", ["userId"])
        .index("by_userId_timestamp", ["userId", "timestamp"]),
});