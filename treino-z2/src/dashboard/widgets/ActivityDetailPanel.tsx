import type { Activity, ZoneKey } from "../../types";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDuration, formatPace } from "../../utils/format";

const ZONE_KEYS: ZoneKey[] = ["Z1", "Z2", "Z3", "Z4", "Z5"];

/**
 * Activity Details -- distance/time/HR/power/best-efforts/zone minutes,
 * every field already stored on `Activity`. Laps, splits, altitude and a
 * route map need the Activity Engine's `laps`/`records` tables (migration
 * 0005), which have no read-side repository exposed to the presentation
 * layer yet -- deferred to the History module's own Activity Details
 * (Phase B), per DASHBOARD_REPORT.md's Limitations.
 */
export function ActivityDetailPanel({ activity }: { activity: Activity }) {
  const paceMinPerKm = activity.distanceM && activity.movingTimeS && activity.distanceM > 0 ? activity.movingTimeS / 60 / (activity.distanceM / 1000) : null;

  return (
    <Card title={activity.name}>
      <dl className="dash-detail-grid">
        <div>
          <dt>Date</dt>
          <dd>{activity.startDate.slice(0, 10)}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{activity.distanceM != null ? `${(activity.distanceM / 1000).toFixed(2)}km` : "–"}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(activity.movingTimeS)}</dd>
        </div>
        <div>
          <dt>Pace</dt>
          <dd>{formatPace(paceMinPerKm)}</dd>
        </div>
        <div>
          <dt>Avg Heart Rate</dt>
          <dd>{activity.averageHeartrate != null ? `${Math.round(activity.averageHeartrate)}bpm` : "–"}</dd>
        </div>
        <div>
          <dt>Avg Power</dt>
          <dd>{activity.averageWatts != null ? `${Math.round(activity.averageWatts)}W` : "–"}</dd>
        </div>
        <div>
          <dt>Weighted Power</dt>
          <dd>{activity.weightedAverageWatts != null ? `${Math.round(activity.weightedAverageWatts)}W` : "–"}</dd>
        </div>
        <div>
          <dt>rTSS</dt>
          <dd>{activity.rtss != null ? activity.rtss.toFixed(0) : "–"}</dd>
        </div>
      </dl>

      <h3 className="dash-subheading">Best Efforts</h3>
      {activity.bestEfforts && Object.keys(activity.bestEfforts).length > 0 ? (
        <ul className="dash-plain-list">
          {Object.entries(activity.bestEfforts).map(([key, timeSec]) => (
            <li key={key}>
              {key}: {formatDuration(timeSec)}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No best efforts recorded for this activity." />
      )}

      <h3 className="dash-subheading">Zone Minutes</h3>
      {activity.zoneMinutes ? (
        <ul className="dash-plain-list">
          {ZONE_KEYS.map((zone) => (
            <li key={zone}>
              {zone}: {activity.zoneMinutes![zone].toFixed(0)}min
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No zone data recorded for this activity." />
      )}
    </Card>
  );
}
