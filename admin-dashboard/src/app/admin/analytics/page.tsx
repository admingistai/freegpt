"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AnalyticsPage() {
  const conversationsPerDay = useQuery(api.analytics.getConversationsPerDay, {
    days: 14,
  });
  const modelStats = useQuery(api.analytics.getModelStats);
  const productStats = useQuery(api.analytics.getProductStats);
  const conversationsPerDevice = useQuery(api.analytics.getConversationsPerDevice, {
    limit: 10,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Insights from captured conversations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Conversations Over Time (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {conversationsPerDay === undefined ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={conversationsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    labelFormatter={(date) =>
                      new Date(date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Model Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {modelStats === undefined ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : modelStats.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={modelStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ model, percent }) =>
                      `${model} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {modelStats.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Devices */}
        <Card>
          <CardHeader>
            <CardTitle>Top Devices by Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {conversationsPerDevice === undefined ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : conversationsPerDevice.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart
                  data={conversationsPerDevice}
                  layout="vertical"
                  margin={{ left: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="fingerprint" type="category" width={80} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="conversationCount" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products Mentioned</CardTitle>
          </CardHeader>
          <CardContent>
            {productStats === undefined ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : productStats.topProducts.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No product data available
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {productStats.topProducts.map((product, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{product.name}</span>
                      <span className="text-muted-foreground">{product.count} mentions</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(product.count / productStats.topProducts[0].count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Retailers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Retailers (Clicked URLs)</CardTitle>
          </CardHeader>
          <CardContent>
            {productStats === undefined ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : productStats.topRetailers.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                No clicked URLs recorded yet
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {productStats.topRetailers.map((retailer, index) => (
                  <Card key={index} className="min-w-[150px]">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold">{retailer.count}</p>
                      <p className="text-sm text-muted-foreground">{retailer.retailer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
