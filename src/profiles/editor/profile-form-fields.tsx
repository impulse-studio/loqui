import type { Profile } from "../../shared/types/profile";

interface ProfileFormFieldsProps {
  profile: Profile;
  onChange: (updates: Partial<Profile>) => void;
}

export default function ProfileFormFields({
  profile,
  onChange,
}: ProfileFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-primary">Name</label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Profile name"
          className="w-full h-9 px-3 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-text-primary">
          System Prompt
        </label>
        <textarea
          value={profile.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="Instructions for the LLM on how to refactor your transcriptions..."
          rows={5}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary resize-y focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>
    </div>
  );
}
