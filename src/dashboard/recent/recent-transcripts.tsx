import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../shared/components/card";
import Badge from "../../shared/components/badge/badge";
import { getTranscripts } from "../../shared/lib/tauri-commands";
import type { Transcript } from "../../shared/types/transcript";
import relativeTime from "../../shared/lib/utils/relative-time";
import truncate from "../../shared/lib/utils/truncate";

export default function RecentTranscripts() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getTranscripts({ limit: 5 })
      .then(setTranscripts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="h-20 flex items-center justify-center">
        <span className="text-text-tertiary text-sm">Loading...</span>
      </Card>
    );
  }

  if (transcripts.length === 0) {
    return (
      <Card className="divide-y divide-border">
        <div className="px-5 py-4 flex items-center gap-3 text-sm text-text-secondary">
          No transcripts yet. Hold your hotkey and start dictating!
        </div>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border">
      {transcripts.map((t) => (
        <button
          key={t.id}
          onClick={() => navigate(`/transcripts?id=${t.id}`)}
          className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-bg-tertiary/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs text-text-tertiary mb-0.5">
              {t.appName}
            </div>
            <div className="text-sm text-text-primary truncate">
              {truncate(t.rawText, 60)}
            </div>
          </div>
          <Badge>{t.wordCount}w</Badge>
          <span className="text-xs text-text-tertiary whitespace-nowrap">
            {relativeTime(t.createdAt)}
          </span>
        </button>
      ))}
    </Card>
  );
}
