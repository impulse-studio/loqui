export interface Transcript {
  id: string;
  rawText: string;
  refactoredText: string | null;
  appName: string;
  windowTitle: string;
  profileId: string | null;
  profileName: string | null;
  wordCount: number;
  duration: number;
  wordsPerSecond: number;
  status: "success" | "error";
  errorMessage: string | null;
  createdAt: string;
  llmProvider: string;
  llmModelUsed: string;
  llmInputTokens: number;
  llmOutputTokens: number;
  llmCost: number;
}

export interface TranscriptStats {
  totalWords: number;
  totalTranscripts: number;
  avgWordsPerSecond: number;
  timeSavedMinutes: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
  words: number;
}
