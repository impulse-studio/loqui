export interface Profile {
  id: string;
  name: string;
  systemPrompt: string;
  appMappings: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  llmModel: string;
  contextSize: number;
  llmEnabled: boolean;
  llmProvider: string;
}
