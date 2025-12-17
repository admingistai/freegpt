"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";

// Thread detail component - shows all messages in a thread
function ThreadMessages({ conversationId }: { conversationId: string }) {
  const messages = useQuery(api.conversations.getThread, { conversationId });

  if (!messages) {
    return <div className="p-4 text-center text-muted-foreground">Loading thread...</div>;
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, index) => (
        <div key={msg._id} className="relative">
          {/* Timeline connector */}
          {index < messages.length - 1 && (
            <div className="absolute left-4 top-12 w-0.5 h-full bg-border" />
          )}

          <div className="flex gap-3">
            {/* Timeline dot */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {index + 1}
            </div>

            <div className="flex-1 space-y-3">
              <div className="text-xs text-muted-foreground">
                {new Date(msg.timestamp).toLocaleString()}
              </div>

              {/* User Message */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <div className="text-xs font-medium text-primary mb-1">User</div>
                  <p className="text-sm whitespace-pre-wrap">{msg.userMessage}</p>
                </CardContent>
              </Card>

              {/* Assistant Response */}
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Assistant</div>
                  <p className="text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {msg.assistantResponse}
                  </p>
                </CardContent>
              </Card>

              {/* Products if any */}
              {msg.products && msg.products.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.products.map((product, i) => (
                    <Badge key={i} variant="secondary" className="bg-green-100 text-green-800">
                      {product.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductsOnly, setShowProductsOnly] = useState(false);
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);

  // Get threads (grouped conversations)
  const threads = useQuery(api.conversations.listThreads, { limit: 100 });

  // Search still uses the old search query
  const searchResults = useQuery(
    api.conversations.search,
    searchQuery.length >= 2 ? { searchQuery, limit: 50 } : "skip"
  );

  // Filter threads
  const displayData = searchQuery.length >= 2
    ? null // Use search results view instead
    : threads?.filter(thread => {
        if (showProductsOnly && !thread.hasProducts) return false;
        return true;
      });

  // Helper to format time range
  const formatTimeRange = (firstTs: number, lastTs: number) => {
    const first = new Date(firstTs);
    const last = new Date(lastTs);

    if (firstTs === lastTs) {
      return first.toLocaleString();
    }

    // Same day
    if (first.toDateString() === last.toDateString()) {
      return `${first.toLocaleString()} - ${last.toLocaleTimeString()}`;
    }

    return `${first.toLocaleDateString()} - ${last.toLocaleDateString()}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Conversation Threads</h1>
        <p className="text-muted-foreground">Browse conversations grouped by thread</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:ring-2 focus:ring-ring focus:border-input"
                />
              </div>
            </div>

            {/* Products Filter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showProductsOnly}
                onChange={(e) => setShowProductsOnly(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-sm text-muted-foreground">With products only</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Search Results View */}
      {searchQuery.length >= 2 && searchResults && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No results found
                </div>
              ) : (
                searchResults.map((conv) => (
                  <div key={conv._id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        Thread: {conv.conversationId.slice(0, 8)}...
                      </span>
                      <Badge variant="secondary">{conv.model}</Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">
                      {conv.userMessage.slice(0, 150)}
                      {conv.userMessage.length > 150 && "..."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {conv.assistantResponse.slice(0, 200)}
                      {conv.assistantResponse.length > 200 && "..."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Threads List */}
      {!searchQuery && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {displayData === undefined || displayData === null ? (
                <div className="p-6 text-center text-muted-foreground">Loading...</div>
              ) : displayData.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No conversation threads found
                </div>
              ) : (
                displayData.map((thread) => {
                  const isExpanded = expandedThreadId === thread.conversationId;

                  return (
                    <div key={thread.conversationId} className="hover:bg-muted/50 transition-colors">
                      <button
                        onClick={() => setExpandedThreadId(isExpanded ? null : thread.conversationId)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {thread.messageCount} {thread.messageCount === 1 ? "message" : "messages"}
                              </Badge>
                              <Badge variant="secondary">{thread.model}</Badge>
                              {thread.hasProducts && (
                                <Badge className="bg-green-100 text-green-800">Has products</Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">
                              {thread.firstMessage.slice(0, 150)}
                              {thread.firstMessage.length > 150 && "..."}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimeRange(thread.firstTimestamp, thread.lastTimestamp)}
                            </p>
                          </div>
                          <div className="ml-4 flex items-center">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-6 pt-2 bg-muted/30 border-t">
                          <ThreadMessages conversationId={thread.conversationId} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
