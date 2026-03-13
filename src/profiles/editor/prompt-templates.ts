export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
}

const promptTemplates: PromptTemplate[] = [
  {
    id: "casual",
    name: "Casual",
    prompt:
      "Keep the natural tone but fix grammar, remove filler words, and clean up the text.",
  },
  {
    id: "professional",
    name: "Professional",
    prompt:
      "Rewrite in a professional tone. Fix grammar, remove filler words, and improve clarity while keeping the meaning.",
  },
  {
    id: "technical",
    name: "Technical",
    prompt:
      "Clean up for technical documentation. Use precise language, fix grammar, and structure the content clearly.",
  },
  {
    id: "email",
    name: "Email",
    prompt:
      "Format as a well-structured email. Fix grammar, add appropriate greeting and sign-off, and keep a professional but friendly tone.",
  },
  {
    id: "minimal",
    name: "Minimal Cleanup",
    prompt:
      "Only fix obvious grammar mistakes and remove filler words. Preserve the original wording as much as possible.",
  },
];

export default promptTemplates;
