import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get overall statistics
 */
export const getStats = query({
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    const devices = await ctx.db.query("devices").collect();

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Count unique threads (distinct conversationId values)
    const uniqueThreads = new Set(conversations.map((c) => c.conversationId));

    // Count conversations today
    const conversationsToday = conversations.filter(
      (c) => c.timestamp > oneDayAgo
    ).length;

    // Count conversations this week
    const conversationsThisWeek = conversations.filter(
      (c) => c.timestamp > oneWeekAgo
    ).length;

    // Count conversations with products
    const conversationsWithProducts = conversations.filter(
      (c) => c.products && c.products.length > 0
    ).length;

    // Count clicked product URLs
    const totalClickedUrls = conversations.reduce(
      (acc, c) => acc + (c.clickedProductUrls?.length || 0),
      0
    );

    return {
      totalMessages: conversations.length,
      totalThreads: uniqueThreads.size,
      totalDevices: devices.length,
      conversationsToday,
      conversationsThisWeek,
      conversationsWithProducts,
      totalClickedUrls,
      // Keep legacy field for backward compatibility
      totalConversations: conversations.length,
    };
  },
});

/**
 * Get conversations per day for the last N days
 */
export const getConversationsPerDay = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const numDays = args.days || 7;
    const conversations = await ctx.db.query("conversations").collect();

    const now = Date.now();
    const result: { date: string; count: number }[] = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = conversations.filter(
        (c) => c.timestamp >= dayStart.getTime() && c.timestamp <= dayEnd.getTime()
      ).length;

      result.push({
        date: dayStart.toISOString().split("T")[0],
        count,
      });
    }

    return result;
  },
});

/**
 * Get conversations per device (top N devices)
 */
export const getConversationsPerDevice = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const devices = await ctx.db
      .query("devices")
      .order("desc")
      .collect();

    // Sort by conversation count
    const sorted = devices.sort(
      (a, b) => b.conversationCount - a.conversationCount
    );

    return sorted.slice(0, limit).map((d) => ({
      fingerprint: d.fingerprint.slice(0, 8) + "...",
      fullFingerprint: d.fingerprint,
      conversationCount: d.conversationCount,
      lastSeen: d.lastSeen,
    }));
  },
});

/**
 * Get model usage statistics
 */
export const getModelStats = query({
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();

    const modelCounts: Record<string, number> = {};
    for (const c of conversations) {
      const model = c.model || "unknown";
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    }

    return Object.entries(modelCounts)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Get product statistics
 */
export const getProductStats = query({
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();

    // Count product mentions
    const productCounts: Record<string, number> = {};
    for (const c of conversations) {
      if (c.products) {
        for (const p of c.products) {
          productCounts[p.name] = (productCounts[p.name] || 0) + 1;
        }
      }
    }

    // Count clicked retailers
    const retailerCounts: Record<string, number> = {};
    for (const c of conversations) {
      if (c.clickedProductUrls) {
        for (const url of c.clickedProductUrls) {
          retailerCounts[url.retailer] = (retailerCounts[url.retailer] || 0) + 1;
        }
      }
    }

    return {
      topProducts: Object.entries(productCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topRetailers: Object.entries(retailerCounts)
        .map(([retailer, count]) => ({ retailer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  },
});
