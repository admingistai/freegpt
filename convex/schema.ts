import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Captured conversations from ChatGPT
  conversations: defineTable({
    // Device identifier (anonymous)
    deviceId: v.string(),

    // ChatGPT conversation identifiers
    conversationId: v.string(),
    messageId: v.optional(v.string()),

    // Model used
    model: v.string(),

    // Message content
    userMessage: v.string(),
    assistantResponse: v.string(),

    // Timestamp from extension
    timestamp: v.number(),

    // Products mentioned in response (from SSE stream)
    products: v.optional(
      v.array(
        v.object({
          index: v.number(),
          name: v.string(),
        })
      )
    ),

    // Clicked product URLs (from window.open intercept)
    clickedProductUrls: v.optional(
      v.array(
        v.object({
          url: v.string(),
          retailer: v.string(),
          clickedAt: v.number(),
        })
      )
    ),

    // Platform info
    platform: v.optional(v.string()),
  })
    .index("by_device", ["deviceId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_conversation", ["conversationId"])
    .index("by_device_and_message", ["deviceId", "conversationId", "messageId"]),

  // Unique extension installations
  devices: defineTable({
    fingerprint: v.string(),
    firstSeen: v.number(),
    lastSeen: v.number(),
    conversationCount: v.number(),
    platform: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_fingerprint", ["fingerprint"]),
});
