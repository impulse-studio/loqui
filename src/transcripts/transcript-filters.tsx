import { Search } from "lucide-react";
import PeriodSelector from "../shared/components/period-selector";
import filterChips from "./filter-chips";

interface TranscriptFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function TranscriptFilters({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: TranscriptFiltersProps) {
  return (
    <div>
      <div className="px-4 pt-5 pb-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-bg-card text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
      <div className="px-4 pb-3">
        <PeriodSelector
          periods={filterChips}
          active={activeFilter}
          onChange={onFilterChange}
        />
      </div>
    </div>
  );
}
