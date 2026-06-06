import Badge from "../shared/components/badge/badge";
import cn from "../shared/lib/utils/cn";
import type { Transcript } from "../shared/types/transcript";
import relativeTime from "../shared/lib/utils/relative-time";
import truncate from "../shared/lib/utils/truncate";

interface TranscriptItemProps {
  transcript: Transcript;
  selected: boolean;
  onClick: () => void;
}

export default function TranscriptItem({
  transcript,
  selected,
  onClick,
}: TranscriptItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-l-2",
        "transition-colors duration-150 ease-out motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40",
        selected
          ? "border-accent bg-accent/5"
          : "border-transparent hover:bg-bg-tertiary/50"
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-text-tertiary">{transcript.appName}</span>
        <span className="text-xs text-text-tertiary">
          {relativeTime(transcript.createdAt)}
        </span>
      </div>
      <div className="text-sm text-text-primary mb-1">
        {truncate(transcript.rawText, 60)}
      </div>
      <div className="flex items-center gap-1.5">
        <Badge>{transcript.wordCount}w</Badge>
        {transcript.llmCost > 0 && (
          <Badge variant="default">${transcript.llmCost.toFixed(3)}</Badge>
        )}
      </div>
    </button>
  );
}
