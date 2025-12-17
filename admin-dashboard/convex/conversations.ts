import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

/**
 * Internal mutation to create a conversation (called from HTTP action)
 */
export const create = internalMutation({
  args: {
    deviceId: v.string(),
    conversationId: v.string(),
    messageId: v.optional(v.string()),
    model: v.string(),
    userMessage: v.string(),
    assistantResponse: v.string(),
    timestamp: v.number(),
    products: v.optional(
      v.array(
        v.object({
          index: v.number(),
          name: v.string(),
        })
      )
    ),
    clickedProductUrls: v.optional(
      v.array(
        v.object({
          url: v.string(),
          retailer: v.string(),
          clickedAt: v.number(),
        })
      )
    ),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate (same device + conversation + message)
    if (args.messageId) {
      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_device_and_message", (q) =>
          q
            .eq("deviceId", args.deviceId)
            .eq("conversationId", args.conversationId)
            .eq("messageId", args.messageId)
        )
        .first();

      if (existing) {
        // Update if clicked URLs are provided
        if (args.clickedProductUrls && args.clickedProductUrls.length > 0) {
          const existingUrls = existing.clickedProductUrls || [];
          const newUrls = args.clickedProductUrls.filter(
            (newUrl) => !existingUrls.some((e) => e.url === newUrl.url)
          );
          if (newUrls.length > 0) {
            await ctx.db.patch(existing._id, {
              clickedProductUrls: [...existingUrls, ...newUrls],
            });
          }
        }
        return existing._id;
      }
    }

    // Insert new conversation
    return await ctx.db.insert("conversations", {
      deviceId: args.deviceId,
      conversationId: args.conversationId,
      messageId: args.messageId,
      model: args.model,
      userMessage: args.userMessage,
      assistantResponse: args.assistantResponse,
      timestamp: args.timestamp,
      products: args.products,
      clickedProductUrls: args.clickedProductUrls,
      platform: args.platform,
    });
  },
});

/**
 * Add a clicked product URL to the most recent conversation for a device
 */
export const addClickedProductUrl = internalMutation({
  args: {
    deviceId: v.string(),
    url: v.string(),
    retailer: v.string(),
    clickedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the most recent conversation for this device
    const mostRecent = await ctx.db
      .query("conversations")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .order("desc")
      .first();

    if (!mostRecent) {
      console.log("No conversation found for device:", args.deviceId);
      return null;
    }

    // Get existing clicked URLs or initialize empty array
    const existingUrls = mostRecent.clickedProductUrls || [];

    // Check for duplicate
    if (existingUrls.some((u) => u.url === args.url)) {
      console.log("Duplicate URL, skipping:", args.url);
      return mostRecent._id;
    }

    // Add the new clicked URL
    const updatedUrls = [
      ...existingUrls,
      {
        url: args.url,
        retailer: args.retailer,
        clickedAt: args.clickedAt,
      },
    ];

    await ctx.db.patch(mostRecent._id, {
      clickedProductUrls: updatedUrls,
    });

    console.log("Added clicked URL to conversation:", mostRecent._id);
    return mostRecent._id;
  },
});

/**
 * List conversations with pagination and optional filters
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    deviceId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    hasProducts: v.optional(v.boolean()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Build query based on filters
    const baseQuery = args.deviceId
      ? ctx.db
          .query("conversations")
          .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId!))
      : ctx.db.query("conversations").withIndex("by_timestamp");

    // Paginate first, then filter in memory for other criteria
    const results = await baseQuery.order("desc").paginate(args.paginationOpts);

    // Apply additional filters in memory
    let filtered = results.page;

    if (args.startDate) {
      filtered = filtered.filter((c) => c.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      filtered = filtered.filter((c) => c.timestamp <= args.endDate!);
    }

    if (args.hasProducts) {
      filtered = filtered.filter(
        (c) => c.products && c.products.length > 0
      );
    }

    if (args.model) {
      filtered = filtered.filter((c) => c.model === args.model);
    }

    return {
      ...results,
      page: filtered,
    };
  },
});

/**
 * Search conversations by text (basic JS filter for MVP)
 */
export const search = query({
  args: {
    searchQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchLower = args.searchQuery.toLowerCase();
    const limit = args.limit || 50;

    // Get all conversations and filter
    const all = await ctx.db.query("conversations").order("desc").collect();

    const matches = all.filter(
      (c) =>
        c.userMessage.toLowerCase().includes(searchLower) ||
        c.assistantResponse.toLowerCase().includes(searchLower)
    );

    return matches.slice(0, limit);
  },
});

/**
 * Get a single conversation by ID
 */
export const getById = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get recent conversations (for dashboard feed)
 */
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    return await ctx.db
      .query("conversations")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get all conversations (for export)
 */
export const getAll = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("conversations")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    if (args.startDate) {
      results = results.filter((c) => c.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      results = results.filter((c) => c.timestamp <= args.endDate!);
    }

    return results;
  },
});

/**
 * Get unique models from conversations
 */
export const getUniqueModels = query({
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    const models = [...new Set(conversations.map((c) => c.model))];
    return models.filter(Boolean).sort();
  },
});

/**
 * List unique conversation threads (grouped by conversationId)
 */
export const listThreads = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const all = await ctx.db
      .query("conversations")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // Group by conversationId
    const threadMap = new Map<string, {
      conversationId: string;
      deviceId: string;
      model: string;
      messageCount: number;
      firstMessage: string;
      lastTimestamp: number;
      firstTimestamp: number;
      hasProducts: boolean;
    }>();

    for (const msg of all) {
      const existing = threadMap.get(msg.conversationId);
      if (!existing) {
        threadMap.set(msg.conversationId, {
          conversationId: msg.conversationId,
          deviceId: msg.deviceId,
          model: msg.model,
          messageCount: 1,
          firstMessage: msg.userMessage,
          lastTimestamp: msg.timestamp,
          firstTimestamp: msg.timestamp,
          hasProducts: !!(msg.products && msg.products.length > 0),
        });
      } else {
        existing.messageCount++;
        if (msg.timestamp < existing.firstTimestamp) {
          existing.firstTimestamp = msg.timestamp;
          existing.firstMessage = msg.userMessage;
        }
        if (msg.timestamp > existing.lastTimestamp) {
          existing.lastTimestamp = msg.timestamp;
        }
        if (msg.products && msg.products.length > 0) {
          existing.hasProducts = true;
        }
      }
    }

    return Array.from(threadMap.values())
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
      .slice(0, limit);
  },
});

/**
 * Get all messages in a conversation thread
 */
export const getThread = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc") // Oldest first for chronological order
      .collect();
  },
});
