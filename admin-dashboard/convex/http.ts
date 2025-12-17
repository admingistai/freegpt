import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * CORS headers for Chrome extension access
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Handle OPTIONS preflight requests
 */
http.route({
  path: "/ingest",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

/**
 * POST /ingest - Receive conversation data from Chrome extension
 */
http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const data = await request.json();

      // Validate required fields
      if (!data.deviceId) {
        return new Response(
          JSON.stringify({ error: "deviceId is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!data.userMessage) {
        return new Response(
          JSON.stringify({ error: "userMessage is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Update or create device record
      await ctx.runMutation(internal.devices.upsertDevice, {
        fingerprint: data.deviceId,
        platform: data.platform || undefined,
        userAgent: data.userAgent || undefined,
      });

      // Store conversation
      const conversationId = await ctx.runMutation(internal.conversations.create, {
        deviceId: data.deviceId,
        conversationId: data.conversationId || "unknown",
        messageId: data.messageId || undefined,
        model: data.model || "unknown",
        userMessage: data.userMessage,
        assistantResponse: data.assistantResponse || "",
        timestamp: data.timestamp || Date.now(),
        products: data.products || undefined,
        clickedProductUrls: data.clickedProductUrls || undefined,
        platform: data.platform || undefined,
      });

      return new Response(
        JSON.stringify({ success: true, id: conversationId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Ingest error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * POST /ingest/product-url - Receive clicked product URL
 */
http.route({
  path: "/ingest/product-url",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/ingest/product-url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const data = await request.json();

      // Validate required fields
      if (!data.deviceId || !data.url) {
        return new Response(
          JSON.stringify({ error: "deviceId and url are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Add clicked URL to the most recent conversation for this device
      const conversationId = await ctx.runMutation(
        internal.conversations.addClickedProductUrl,
        {
          deviceId: data.deviceId,
          url: data.url,
          retailer: data.retailer || "unknown",
          clickedAt: data.clickedAt || Date.now(),
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Product URL saved",
          conversationId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Product URL ingest error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
