import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getTranscripts,
  getTranscript,
  deleteTranscript,
} from "../shared/lib/tauri-commands";
import { toast } from "../shared/components/toast-container/toast-container";
import type { Transcript } from "../shared/types/transcript";
import pageSize from "./page-size";
import filterMap from "./filter-map";
import TranscriptFilters from "./transcript-filters";
import TranscriptList from "./transcript-list";
import TranscriptDetail from "./transcript-detail";

export default function TranscriptsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTranscript, setSelectedTranscript] =
    useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const initialIdHandled = useRef(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load transcripts when search/filter changes
  const loadTranscripts = useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const result = await getTranscripts({
          search: debouncedSearch || undefined,
          filter: filterMap[activeFilter],
          limit: pageSize,
          offset,
        });
        if (offset === 0) {
          setTranscripts(result);
        } else {
          setTranscripts((prev) => [...prev, ...result]);
        }
        setHasMore(result.length === pageSize);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, activeFilter],
  );

  useEffect(() => {
    loadTranscripts(0);
  }, [loadTranscripts]);

  // Pre-select from URL ?id=xxx
  useEffect(() => {
    if (initialIdHandled.current) return;
    const id = searchParams.get("id");
    if (id) {
      initialIdHandled.current = true;
      setSelectedId(id);
    }
  }, [searchParams]);

  // Load selected transcript detail
  useEffect(() => {
    if (!selectedId) {
      setSelectedTranscript(null);
      return;
    }
    getTranscript(selectedId)
      .then(setSelectedTranscript)
      .catch(() => setSelectedTranscript(null));
  }, [selectedId]);

  const handleLoadMore = () => {
    loadTranscripts(transcripts.length);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTranscript(id);
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
      setSelectedId(null);
      toast("Transcript deleted");
    } catch {
      toast("Failed to delete", "error");
    }
  };

  return (
    <div className="flex h-full -mx-8 -my-6">
      {/* Left panel */}
      <div className="w-[300px] min-w-[300px] border-r border-border flex flex-col">
        <TranscriptFilters
          search={search}
          onSearchChange={setSearch}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
        <TranscriptList
          transcripts={transcripts}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {selectedTranscript ? (
          <TranscriptDetail
            transcript={selectedTranscript}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-sm text-text-tertiary">
              Select a transcript to view details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
