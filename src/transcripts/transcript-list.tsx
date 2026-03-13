import type { Transcript } from "../shared/types/transcript";
import Button from "../shared/components/button/button";
import TranscriptItem from "./transcript-item";

interface TranscriptListProps {
  transcripts: Transcript[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function TranscriptList({
  transcripts,
  selectedId,
  onSelect,
  loading,
  hasMore,
  onLoadMore,
}: TranscriptListProps) {
  if (loading && transcripts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-text-tertiary">Loading...</span>
      </div>
    );
  }

  if (transcripts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-text-tertiary text-center">
          No transcripts yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {transcripts.map((t) => (
        <TranscriptItem
          key={t.id}
          transcript={t}
          selected={t.id === selectedId}
          onClick={() => onSelect(t.id)}
        />
      ))}
      {hasMore && (
        <div className="px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
