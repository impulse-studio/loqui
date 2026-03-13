interface ProviderTab {
  id: string;
  label: string;
}

const providerTabOptions: ProviderTab[] = [
  { id: "disabled", label: "Disabled" },
  { id: "local", label: "Local" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
];

export default providerTabOptions;
