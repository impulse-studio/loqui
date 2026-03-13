import cn from "../../shared/lib/utils/cn";
import Badge from "../../shared/components/badge";
import type { Profile } from "../../shared/types/profile";

interface ProfileListItemProps {
  profile: Profile;
  selected: boolean;
  onSelect: () => void;
}

export default function ProfileListItem({
  profile,
  selected,
  onSelect,
}: ProfileListItemProps) {
  const appCount = (() => {
    try {
      const mappings: string[] = JSON.parse(profile.appMappings);
      return mappings.length;
    } catch {
      return 0;
    }
  })();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-between",
        selected
          ? "bg-accent-subtle"
          : "hover:bg-bg-secondary"
      )}
    >
      <span className="text-sm font-medium text-text-primary truncate">
        {profile.name}
      </span>
      {profile.isDefault ? (
        <Badge variant="accent">Default</Badge>
      ) : (
        <Badge variant="default">
          {appCount} {appCount === 1 ? "app" : "apps"}
        </Badge>
      )}
    </button>
  );
}
