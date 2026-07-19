import { useMemo, useState } from "react";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterBar } from "../components/FilterBar";
import { VirtualList } from "../components/VirtualList";
import { ActivityListItem } from "../widgets/ActivityListItem";
import { ActivityDetailPanel } from "../widgets/ActivityDetailPanel";
import { useAthleteData } from "../hooks/useAthleteData";
import type { Activity } from "../../types";

const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
];

const ROW_HEIGHT = 56;
const VIEWPORT_HEIGHT = 480;

/**
 * Activities page: full history (fetchRecentActivities, already fetched by
 * useAthleteData -- no separate query here), a search-by-name + date-range
 * filter, and a virtualized list so a multi-hundred-row history doesn't
 * render every row's DOM eagerly. Filtering happens client-side over the
 * already-fetched page since 200 activities (the current fetch cap) is
 * comfortably small for that; a server-side filtered query is left to the
 * History module (Phase B) once activity volume or filter complexity grows.
 */
export function ActivitiesPage() {
  const { state, retry } = useAthleteData();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [selected, setSelected] = useState<Activity | null>(null);

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    const cutoff = range === "all" ? null : new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10);
    return state.data.activities.filter((a) => {
      const matchesSearch = search.trim() === "" || a.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesRange = cutoff == null || a.startDate.slice(0, 10) >= cutoff;
      return matchesSearch && matchesRange;
    });
  }, [state, search, range]);

  if (state.status === "loading") return <LoadingState message="Loading activities…" />;
  if (state.status === "error") return <ErrorState title="Could not load activities." message={state.message} onRetry={retry} />;

  return (
    <div className="dashboard">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search activities by name…"
        selectLabel="Range"
        selectValue={range}
        selectOptions={RANGE_OPTIONS}
        onSelectChange={setRange}
      />

      {filtered.length === 0 ? (
        <EmptyState message="No activities match these filters." />
      ) : (
        <VirtualList
          items={filtered}
          itemHeight={ROW_HEIGHT}
          viewportHeight={VIEWPORT_HEIGHT}
          getKey={(a) => a.id}
          ariaLabel="Activity history"
          renderItem={(a) => <ActivityListItem activity={a} selected={selected?.id === a.id} onSelect={setSelected} />}
        />
      )}

      {selected && <ActivityDetailPanel activity={selected} />}
    </div>
  );
}
