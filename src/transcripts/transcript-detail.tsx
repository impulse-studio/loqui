import { useMemo, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import Button from "../shared/components/button/button";
import Card from "../shared/components/card";
import Modal from "../shared/components/modal";
import { toast } from "../shared/components/toast-container/toast-container";
import cn from "../shared/lib/utils/cn";
import computeDiff from "../shared/lib/utils/compute-diff";
import type { Transcript } from "../shared/types/transcript";
import relativeTime from "../shared/lib/utils/relative-time";
import formatDuration from "../shared/lib/utils/format-duration";

interface TranscriptDetailProps {
  transcript: Transcript;
  onDelete: (id: string) => void;
}

type Tab = "raw" | "transformed" | "diff";

export default function TranscriptDetail({
  transcript,
  onDelete,
}: TranscriptDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>(
    transcript.refactoredText ? "transformed" : "raw",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayText =
    activeTab === "raw"
      ? transcript.rawText
      : (transcript.refactoredText ?? transcript.rawText);

  const diffSegments = useMemo(() => {
    if (!transcript.refactoredText) return [];
    return computeDiff(transcript.rawText, transcript.refactoredText);
  }, [transcript.rawText, transcript.refactoredText]);

  const handleCopy = async () => {
    await writeText(displayText);
    toast("Copied to clipboard");
  };

  const handleDelete = () => {
    onDelete(transcript.id);
    setConfirmDelete(false);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "raw", label: "Raw" },
    { key: "transformed", label: "Transformed" },
    { key: "diff", label: "Diff" },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-0.5">
            {transcript.appName}
          </h2>
          {transcript.windowTitle && (
            <p className="text-xs text-text-tertiary">
              {transcript.windowTitle}
            </p>
          )}
          <p className="text-xs text-text-tertiary mt-0.5">
            {relativeTime(transcript.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            <Copy size={14} />
            Copy
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>

      {/* Profile card */}
      {transcript.profileName && (
        <Card className="px-5 py-3 mb-4">
          <p className="text-xs text-text-tertiary mb-0.5">Profile used</p>
          <p className="text-sm font-medium text-text-primary">
            {transcript.profileName}
          </p>
        </Card>
      )}

      {/* Result card */}
      <Card className="mb-4 overflow-hidden">
        {transcript.refactoredText && (
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 px-4 py-2 text-xs font-medium transition-colors text-center",
                  activeTab === tab.key
                    ? "text-accent border-b-2 border-accent"
                    : "text-text-tertiary hover:text-text-secondary",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <div className="px-5 py-4">
          {activeTab === "diff" ? (
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {diffSegments.map((seg, i) => (
                <span
                  key={i}
                  className={cn(
                    seg.type === "removed" &&
                      "bg-error/15 text-error line-through",
                    seg.type === "added" && "bg-success/15 text-success",
                  )}
                >
                  {seg.text}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {displayText}
            </p>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="flex gap-6 text-xs text-text-secondary">
        <span>{transcript.wordCount} words</span>
        <span>{formatDuration(transcript.duration)}</span>
        <span>{transcript.wordsPerSecond.toFixed(1)} w/s</span>
        {transcript.llmModelUsed && (
          <span>
            {transcript.llmModelUsed} &middot;{" "}
            {transcript.llmInputTokens + transcript.llmOutputTokens} tokens
          </span>
        )}
        {transcript.llmCost > 0 && (
          <span>${transcript.llmCost.toFixed(3)}</span>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete transcript?"
      >
        <p className="text-sm text-text-secondary mb-6">
          This action cannot be undone. The transcript will be permanently
          deleted.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
