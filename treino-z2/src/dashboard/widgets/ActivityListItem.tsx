import type { Activity } from "../../types";
import { formatDuration } from "../../utils/format";

export interface ActivityListItemProps {
  activity: Activity;
  selected: boolean;
  onSelect: (activity: Activity) => void;
}

/** One row in the Activities page's virtualized list. */
export function ActivityListItem({ activity, selected, onSelect }: ActivityListItemProps) {
  return (
    <button type="button" className={selected ? "dash-activity-row dash-activity-row-selected" : "dash-activity-row"} onClick={() => onSelect(activity)}>
      <span className="timeline-date">{activity.startDate.slice(0, 10)}</span>
      <span className="dash-activity-name">{activity.name}</span>
      <span className="dash-activity-meta">{activity.distanceM != null ? `${(activity.distanceM / 1000).toFixed(1)}km` : "–"}</span>
      <span className="dash-activity-meta">{formatDuration(activity.movingTimeS)}</span>
    </button>
  );
}
