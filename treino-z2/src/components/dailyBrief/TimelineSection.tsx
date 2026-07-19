import type { TimelineEvent } from "../../hooks/assembleDailyBrief";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";

/** Answers: "What have I done recently?" */
export function TimelineSection({ events }: { events: TimelineEvent[] }) {
  return (
    <Card title="Timeline">
      {events.length === 0 ? (
        <EmptyState message="No activities synced yet." />
      ) : (
        <ul className="timeline-list">
          {events.map((event, i) => (
            <li key={i} className={event.kind === "personal_record" ? "timeline-pr" : undefined}>
              <span className="timeline-date">{event.date}</span>
              <span className="timeline-title">{event.title}</span>
              <span className="timeline-description">{event.description}</span>
              {event.kind === "personal_record" && <span className="timeline-badge">PR</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
