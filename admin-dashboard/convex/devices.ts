import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * Internal mutation to upsert a device record (called from HTTP action)
 */
export const upsertDevice = internalMutation({
  args: {
    fingerprint: v.string(),
    platform: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if device exists
    const existing = await ctx.db
      .query("devices")
      .withIndex("by_fingerprint", (q) => q.eq("fingerprint", args.fingerprint))
      .first();

    if (existing) {
      // Update existing device
      await ctx.db.patch(existing._id, {
        lastSeen: now,
        conversationCount: existing.conversationCount + 1,
        platform: args.platform || existing.platform,
        userAgent: args.userAgent || existing.userAgent,
      });
      return existing._id;
    }

    // Create new device
    return await ctx.db.insert("devices", {
      fingerprint: args.fingerprint,
      firstSeen: now,
      lastSeen: now,
      conversationCount: 1,
      platform: args.platform,
      userAgent: args.userAgent,
    });
  },
});

/**
 * List all devices
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("devices")
      .order("desc")
      .collect();
  },
});

/**
 * Get device by fingerprint
 */
export const getByFingerprint = query({
  args: { fingerprint: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("devices")
      .withIndex("by_fingerprint", (q) => q.eq("fingerprint", args.fingerprint))
      .first();
  },
});

/**
 * Get device by ID
 */
export const getById = query({
  args: { id: v.id("devices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get total device count
 */
export const getCount = query({
  handler: async (ctx) => {
    const devices = await ctx.db.query("devices").collect();
    return devices.length;
  },
});
