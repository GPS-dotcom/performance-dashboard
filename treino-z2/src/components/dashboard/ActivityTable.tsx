import type { Activity } from "../../types";
import { paceMinPerKm } from "../../engines/metrics/metricsEngine";
import { formatPace } from "../../utils/format";

export function ActivityTable({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="empty-note">No activities synced yet.</p>;
  }

  return (
    <table className="activity-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Activity</th>
          <th>Distance</th>
          <th>Pace</th>
          <th>HR</th>
          <th>rTSS</th>
        </tr>
      </thead>
      <tbody>
        {activities.slice(0, 20).map((a) => (
          <tr key={a.id}>
            <td>{a.startDate.slice(0, 10)}</td>
            <td>{a.name}</td>
            <td>{a.distanceM != null ? `${(a.distanceM / 1000).toFixed(1)} km` : "–"}</td>
            <td>{formatPace(paceMinPerKm(a.distanceM, a.movingTimeS))}</td>
            <td>{a.averageHeartrate != null ? Math.round(a.averageHeartrate) : "–"}</td>
            <td>{a.rtss != null ? Math.round(a.rtss) : "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
