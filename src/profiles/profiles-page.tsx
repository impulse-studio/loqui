import { useCallback, useEffect, useState } from "react";
import type { Profile } from "../shared/types/profile";
import { getProfiles, saveProfile } from "../shared/lib/tauri-commands";
import ProfileList from "./list/profile-list";
import ProfileEditor from "./editor/profile-editor";
import EmptyProfileState from "./list/empty-profile-state";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch (e) {
      console.error("Failed to load profiles:", e);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  async function handleNew() {
    const now = new Date().toISOString();
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      name: "New Profile",
      systemPrompt: "",
      appMappings: "[]",
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      llmModel: "",
      contextSize: 4096,
      llmEnabled: true,
      llmProvider: "disabled",
    };

    try {
      const saved = await saveProfile(newProfile);
      setProfiles((prev) => [...prev, saved]);
      setSelectedId(saved.id);
    } catch (e) {
      console.error("Failed to create profile:", e);
    }
  }

  function handleSaved(updated: Profile) {
    setProfiles((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  }

  async function handleSetDefault(profileId: string) {
    const currentDefault = profiles.find((p) => p.isDefault);
    try {
      if (currentDefault && currentDefault.id !== profileId) {
        const unset = {
          ...currentDefault,
          isDefault: false,
          updatedAt: new Date().toISOString(),
        };
        const savedUnset = await saveProfile(unset);
        setProfiles((prev) =>
          prev.map((p) => (p.id === savedUnset.id ? savedUnset : p)),
        );
      }

      const target = profiles.find((p) => p.id === profileId);
      if (!target) return;
      const updated = {
        ...target,
        isDefault: true,
        updatedAt: new Date().toISOString(),
      };
      const saved = await saveProfile(updated);
      setProfiles((prev) =>
        prev.map((p) => (p.id === saved.id ? saved : p)),
      );
    } catch (e) {
      console.error("Failed to set default profile:", e);
    }
  }

  function handleDeleted(id: string) {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setSelectedId(null);
  }

  return (
    <div className="flex h-full -mx-8 -my-6">
      <ProfileList
        profiles={profiles}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={handleNew}
      />

      {selected ? (
        <ProfileEditor
          key={selected.id}
          profile={selected}
          profiles={profiles}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onSetDefault={handleSetDefault}
        />
      ) : (
        <EmptyProfileState />
      )}
    </div>
  );
}
