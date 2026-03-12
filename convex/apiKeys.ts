import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** SHA-256 a string, return hex digest (works in Convex's V8 runtime) */
async function sha256Hex(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// Public mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new API key.
 *
 * The client MUST generate the raw key itself (crypto.randomUUID-based) and
 * pass it here for hashing. The raw key is never stored — only the SHA-256
 * hash is persisted. The caller should show the raw key to the user once and
 * then discard it.
 */
export const createApiKey = mutation({
    args: {
        name: v.string(),
        rawKey: v.string(), // full key, e.g. "ace_sk_<43 random chars>"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const { rawKey, name } = args;

        // Validate format (must start with our prefix)
        if (!rawKey.startsWith("ace_sk_")) {
            throw new Error("Invalid key format");
        }

        const keyHash = await sha256Hex(rawKey);
        // Prefix: "ace_sk_" + first 8 chars of random portion + "..." = shown in UI
        const prefix = rawKey.slice(0, 16) + "...";

        const apiKeyId = await ctx.db.insert("apiKeys", {
            userId: identity.subject,
            name,
            keyHash,
            prefix,
            status: "active",
            createdAt: Date.now(),
        });

        return { apiKeyId, prefix };
    },
});

/** Revoke an API key — marks it as revoked so validation fails from now on. */
export const revokeApiKey = mutation({
    args: { apiKeyId: v.id("apiKeys") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const key = await ctx.db.get(args.apiKeyId);
        if (!key || key.userId !== identity.subject) {
            throw new Error("Unauthorized: key not found or not owned by you");
        }

        await ctx.db.patch(args.apiKeyId, { status: "revoked" });
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Public queries
// ─────────────────────────────────────────────────────────────────────────────

/** List all API keys for the current user (hash is never returned). */
export const listApiKeys = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const keys = await ctx.db
            .query("apiKeys")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .order("desc")
            .collect();

        // Strip the hash before returning
        return keys.map(({ keyHash: _h, ...rest }) => rest);
    },
});

/** Get usage logs for the current user (most recent first). */
export const getUsageLogs = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const logs = await ctx.db
            .query("usageLogs")
            .withIndex("by_userId_timestamp", (q) =>
                q.eq("userId", identity.subject)
            )
            .order("desc")
            .take(args.limit ?? 20);

        return logs;
    },
});

/** Get total credits used this month for the current user. */
export const getMonthlyUsage = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { creditsUsed: 0, tracksGenerated: 0 };

        // Start of current month in ms
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const logs = await ctx.db
            .query("usageLogs")
            .withIndex("by_userId_timestamp", (q) =>
                q.eq("userId", identity.subject).gte("timestamp", startOfMonth)
            )
            .collect();

        const creditsUsed = logs.reduce((sum, l) => sum + l.creditsUsed, 0);
        const tracksGenerated = logs.filter((l) => l.action === "generate_track").length;

        return { creditsUsed, tracksGenerated };
    },
});

/** Get subscription info for the current user. */
export const getSubscription = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const sub = await ctx.db
            .query("subscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();

        return sub ?? { tier: "free", status: "active" };
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal — used by HTTP action for API key validation
// ─────────────────────────────────────────────────────────────────────────────

export const validateApiKeyInternal = internalQuery({
    args: { keyHash: v.string() },
    handler: async (ctx, args) => {
        const key = await ctx.db
            .query("apiKeys")
            .withIndex("by_keyHash", (q) => q.eq("keyHash", args.keyHash))
            .first();

        if (!key || key.status !== "active") return null;
        return { userId: key.userId, apiKeyId: key._id };
    },
});

/** Update lastUsedAt after a successful validation (called from HTTP action). */
export const touchApiKeyInternal = internalMutation({
    args: { apiKeyId: v.id("apiKeys"), userId: v.string(), action: v.string(), creditsUsed: v.number() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.apiKeyId, { lastUsedAt: Date.now() });
        await ctx.db.insert("usageLogs", {
            userId: args.userId,
            apiKeyId: args.apiKeyId,
            action: args.action,
            creditsUsed: args.creditsUsed,
            timestamp: Date.now(),
        });
    },
});

/** Log usage from the dashboard (no API key). */
export const logDashboardUsage = internalMutation({
    args: { userId: v.string(), action: v.string(), creditsUsed: v.number(), metadata: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await ctx.db.insert("usageLogs", {
            userId: args.userId,
            action: args.action,
            creditsUsed: args.creditsUsed,
            timestamp: Date.now(),
            metadata: args.metadata,
        });
    },
});
