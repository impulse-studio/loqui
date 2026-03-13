import { useRef, useState } from "react";
import { Trash2, Star } from "lucide-react";
import Button from "../../shared/components/button";
import Badge from "../../shared/components/badge";
import type { Profile } from "../../shared/types/profile";
import { saveProfile, deleteProfile } from "../../shared/lib/tauri-commands";
import ProfileFormFields from "./profile-form-fields";
import TemplatePicker from "./template-picker";
import AppMappingSection from "../app-mapping/app-mapping-section";
import LlmModelSelector from "../llm/llm-model-selector";
import TestRefactorSection from "./test-refactor-section";
import ConfirmDefaultModal from "./confirm-default-modal";

interface ProfileEditorProps {
  profile: Profile;
  profiles: Profile[];
  onSaved: (profile: Profile) => void;
  onDeleted: (id: string) => void;
  onSetDefault: (profileId: string) => void;
}

export default function ProfileEditor({
  profile,
  profiles,
  onSaved,
  onDeleted,
  onSetDefault,
}: ProfileEditorProps) {
  const [draft, setDraft] = useState<Profile>(profile);
  const draftRef = useRef(draft);
  const [deleting, setDeleting] = useState(false);
  const [confirmDefaultOpen, setConfirmDefaultOpen] = useState(false);

  const currentDefault = profiles.find(
    (p) => p.isDefault && p.id !== profile.id,
  );

  function updateDraft(updates: Partial<Profile>) {
    const updated = {
      ...draftRef.current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setDraft(updated);
    draftRef.current = updated;
    saveProfile(updated)
      .then(onSaved)
      .catch((e) => console.error("Failed to save profile:", e));
  }

  async function handleDelete() {
    if (!confirm(`Delete profile "${draft.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteProfile(draft.id);
      onDeleted(draft.id);
    } catch (e) {
      console.error("Failed to delete profile:", e);
    } finally {
      setDeleting(false);
    }
  }

  function handleSetDefaultClick() {
    if (currentDefault) {
      setConfirmDefaultOpen(true);
    } else {
      onSetDefault(profile.id);
    }
  }

  function handleConfirmDefault() {
    setConfirmDefaultOpen(false);
    onSetDefault(profile.id);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-[560px] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary">
              {draft.name}
            </h2>
            {profile.isDefault && <Badge variant="accent">Default</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {!profile.isDefault && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSetDefaultClick}
              >
                <Star size={14} />
                Set as default
              </Button>
            )}
            {!profile.isDefault && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            )}
          </div>
        </div>

        <ProfileFormFields profile={draft} onChange={updateDraft} />

        <TemplatePicker
          onApply={(prompt) => updateDraft({ systemPrompt: prompt })}
        />

        <hr className="border-border" />

        <AppMappingSection
          appMappings={draft.appMappings}
          isDefault={profile.isDefault}
          onChange={(appMappings) => updateDraft({ appMappings })}
        />

        <hr className="border-border" />

        <LlmModelSelector
          llmProvider={draft.llmProvider}
          llmModel={draft.llmModel}
          contextSize={draft.contextSize}
          onProviderChange={(llmProvider) =>
            updateDraft({ llmProvider, llmModel: "" })
          }
          onModelChange={(llmModel) => updateDraft({ llmModel })}
          onContextSizeChange={(contextSize) => updateDraft({ contextSize })}
        />

        <hr className="border-border" />

        <TestRefactorSection
          profileId={draft.id}
          systemPrompt={draft.systemPrompt}
        />
      </div>

      <ConfirmDefaultModal
        open={confirmDefaultOpen}
        currentDefaultName={currentDefault?.name ?? ""}
        onConfirm={handleConfirmDefault}
        onCancel={() => setConfirmDefaultOpen(false)}
      />
    </div>
  );
}
