import type { TimelineEvent } from "../../hooks/assembleDailyBrief";

/** Answers: "What have I done recently?" */
export function TimelineSection({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="brief-section">
      <div className="brief-section-label">Timeline</div>
      {events.length === 0 ? (
        <p className="empty-note">No activities synced yet.</p>
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
    </section>
  );
}
