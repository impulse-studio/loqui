import { Plus } from "lucide-react";
import Button from "../../shared/components/button";
import type { Profile } from "../../shared/types/profile";
import ProfileListItem from "./profile-list-item";

interface ProfileListProps {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function ProfileList({
  profiles,
  selectedId,
  onSelect,
  onNew,
}: ProfileListProps) {
  return (
    <div className="w-[260px] min-w-[260px] border-r border-border flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-base font-semibold">Profiles</h2>
        <Button size="sm" onClick={onNew}>
          <Plus size={14} />
          New
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 px-3 pb-4">
        {profiles.map((profile) => (
          <ProfileListItem
            key={profile.id}
            profile={profile}
            selected={profile.id === selectedId}
            onSelect={() => onSelect(profile.id)}
          />
        ))}
      </div>
    </div>
  );
}
