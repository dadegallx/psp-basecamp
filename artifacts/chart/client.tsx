"use client";

import { toast } from "sonner";
import type { ChartContent } from "@/artifacts/chart/server";
import { Artifact } from "@/components/create-artifact";
import { DynamicChart } from "@/components/dynamic-chart";
import {
  CodeIcon,
  CopyIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";

type ChartMetadata = {
  showSQL?: boolean;
};

export const chartArtifact = new Artifact<"chart", ChartMetadata>({
  kind: "chart",
  description: "Create data visualizations and charts",
  initialize: ({ setMetadata }) => {
    setMetadata({ showSQL: false });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-chartDelta") {
      setArtifact((a) => ({
        ...a,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content, metadata, status, isLoading }) => {
    if (isLoading || (status === "streaming" && !content)) {
      return (
        <div className="flex h-full w-full items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-primary" />
            <p className="text-sm text-muted-foreground">Generating chart...</p>
          </div>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="flex h-full w-full items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">No chart data</p>
        </div>
      );
    }

    try {
      const chartContent: ChartContent = JSON.parse(content);
      const { sql, results, config } = chartContent;

      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
          <div className="w-full max-w-3xl">
            <DynamicChart chartData={results} chartConfig={config} />
          </div>
          {metadata?.showSQL && (
            <div className="w-full max-w-3xl rounded-md border bg-muted/50 p-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Generated SQL
              </div>
              <pre className="overflow-x-auto text-xs">
                <code>{sql}</code>
              </pre>
            </div>
          )}
        </div>
      );
    } catch {
      return (
        <div className="flex h-full w-full items-center justify-center p-8">
          <p className="text-sm text-destructive">
            Failed to parse chart data
          </p>
        </div>
      );
    }
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
      icon: <CodeIcon size={18} />,
      description: "Toggle SQL view",
      onClick: ({ setMetadata }) => {
        setMetadata((m) => ({ ...m, showSQL: !m?.showSQL }));
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy chart data as JSON",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied chart data to clipboard!");
      },
    },
  ],
  toolbar: [],
});
