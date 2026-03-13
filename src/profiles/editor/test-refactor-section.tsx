import { useState } from "react";
import { Play } from "lucide-react";
import Button from "../../shared/components/button";
import { testRefactor } from "../../shared/lib/tauri-commands";
import type { RefactorResult } from "../../shared/types/llm";

interface TestRefactorSectionProps {
  profileId: string;
  systemPrompt: string;
}

export default function TestRefactorSection({
  profileId,
  systemPrompt,
}: TestRefactorSectionProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RefactorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    if (!input.trim() || !systemPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await testRefactor(input, systemPrompt, profileId);
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-primary">
        Test Refactor
      </label>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type or paste text to test the refactoring..."
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary resize-y focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
      <Button
        size="sm"
        onClick={handleTest}
        disabled={loading || !input.trim() || !systemPrompt.trim()}
      >
        <Play size={14} />
        {loading ? "Processing..." : "Test"}
      </Button>

      {error && (
        <div className="p-3 rounded-lg bg-error/10 text-sm text-error">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-bg-secondary text-sm text-text-primary whitespace-pre-wrap">
            {result.text}
          </div>
          <p className="text-xs text-text-tertiary">
            {result.modelUsed} &middot; {result.durationMs}ms
          </p>
        </div>
      )}
    </div>
  );
}
