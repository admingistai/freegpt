"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet, Calendar } from "lucide-react";

type ExportFormat = "json" | "csv";

export default function ExportPage() {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const stats = useQuery(api.analytics.getStats);
  const conversations = useQuery(api.conversations.getAll, {
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate).setHours(23, 59, 59, 999) : undefined,
  });

  const handleExport = async () => {
    if (!conversations) return;

    setIsExporting(true);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            totalRecords: conversations.length,
            dateRange: {
              start: startDate || "all",
              end: endDate || "all",
            },
            conversations: conversations.map((conv) => ({
              id: conv._id,
              deviceId: conv.deviceId,
              conversationId: conv.conversationId,
              model: conv.model,
              userMessage: conv.userMessage,
              assistantResponse: conv.assistantResponse,
              timestamp: conv.timestamp,
              date: new Date(conv.timestamp).toISOString(),
              products: conv.products,
              clickedProductUrls: conv.clickedProductUrls,
            })),
          },
          null,
          2
        );
        filename = `llm-tracker-export-${new Date().toISOString().split("T")[0]}.json`;
        mimeType = "application/json";
      } else {
        // CSV format
        const headers = [
          "ID",
          "Device ID",
          "Conversation ID",
          "Model",
          "User Message",
          "Assistant Response",
          "Timestamp",
          "Date",
          "Products",
          "Clicked URLs",
        ];

        const rows = conversations.map((conv) => [
          conv._id,
          conv.deviceId,
          conv.conversationId,
          conv.model,
          `"${conv.userMessage.replace(/"/g, '""')}"`,
          `"${conv.assistantResponse.replace(/"/g, '""')}"`,
          conv.timestamp,
          new Date(conv.timestamp).toISOString(),
          conv.products ? conv.products.map((p) => p.name).join("; ") : "",
          conv.clickedProductUrls
            ? conv.clickedProductUrls.map((u) => u.url).join("; ")
            : "",
        ]);

        content = [headers.join(","), ...rows.map((row) => row.join(","))].join(
          "\n"
        );
        filename = `llm-tracker-export-${new Date().toISOString().split("T")[0]}.csv`;
        mimeType = "text/csv";
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Export Data</h1>
        <p className="text-muted-foreground">Export conversations in various formats</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Calendar className="w-4 h-4" />
                Date Range (optional)
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormat("json")}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-colors ${
                    format === "json"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <FileJson
                    className={`w-8 h-8 ${
                      format === "json" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-left">
                    <p className="font-medium">JSON</p>
                    <p className="text-sm text-muted-foreground">Structured data</p>
                  </div>
                </button>
                <button
                  onClick={() => setFormat("csv")}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-colors ${
                    format === "csv"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <FileSpreadsheet
                    className={`w-8 h-8 ${
                      format === "csv" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-left">
                    <p className="font-medium">CSV</p>
                    <p className="text-sm text-muted-foreground">Spreadsheet compatible</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Export Summary */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Export Summary</h3>
              <p className="text-sm text-muted-foreground">
                {conversations === undefined ? (
                  "Loading..."
                ) : (
                  <>
                    <span className="font-bold text-foreground">{conversations.length}</span>{" "}
                    conversations will be exported
                    {startDate || endDate ? (
                      <span className="text-muted-foreground">
                        {" "}
                        (filtered by date range)
                      </span>
                    ) : (
                      <span className="text-muted-foreground"> (all time)</span>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isExporting || !conversations || conversations.length === 0}
              className="w-full"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              {isExporting ? "Exporting..." : `Export as ${format.toUpperCase()}`}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Database Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-2xl font-bold">
                  {stats?.totalConversations ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">Total Conversations</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-2xl font-bold">
                  {stats?.totalDevices ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">Total Devices</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-2xl font-bold">
                  {stats?.conversationsWithProducts ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">With Products</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-2xl font-bold">
                  {stats?.totalClickedUrls ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">Clicked URLs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
