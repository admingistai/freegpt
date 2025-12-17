"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, ShoppingCart, MousePointer, MessagesSquare } from "lucide-react";

export default function DashboardPage() {
  const stats = useQuery(api.analytics.getStats);
  const recentConversations = useQuery(api.conversations.getRecent, { limit: 5 });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of LLM conversation tracking</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Threads</CardTitle>
            <MessagesSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalThreads ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Unique conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMessages ?? "-"}</div>
            <p className="text-xs text-muted-foreground">{stats?.conversationsToday ?? 0} today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Devices</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDevices ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Active devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">With Products</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversationsWithProducts ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Messages with products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Product Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClickedUrls ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Total clicked URLs</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentConversations === undefined ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : recentConversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No conversations yet. Install the Chrome extension and start chatting!
              </div>
            ) : (
              recentConversations.map((conv) => (
                <div key={conv._id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.userMessage.slice(0, 100)}
                        {conv.userMessage.length > 100 ? "..." : ""}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {conv.assistantResponse.slice(0, 150)}
                        {conv.assistantResponse.length > 150 ? "..." : ""}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs bg-secondary rounded-md">
                      {conv.model}
                    </span>
                    {conv.products && conv.products.length > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-md">
                        {conv.products.length} products
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
