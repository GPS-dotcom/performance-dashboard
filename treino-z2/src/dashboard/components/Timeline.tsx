import { EmptyState } from "../../components/ui/EmptyState";

export interface TimelineItem {
  id: string | number;
  date: string;
  title: string;
  description: string;
  badge?: string;
  highlighted?: boolean;
}

export interface TimelineProps {
  items: TimelineItem[];
  emptyMessage?: string;
}

/** COMPONENT_LIBRARY.md's "Timeline" primitive -- generalizes the Daily Brief's TimelineSection markup so History/Activities/Records can reuse it. */
export function Timeline({ items, emptyMessage = "Nothing to show yet." }: TimelineProps) {
  if (items.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <ul className="timeline-list">
      {items.map((item) => (
        <li key={item.id} className={item.highlighted ? "timeline-pr" : undefined}>
          <span className="timeline-date">{item.date}</span>
          <span className="timeline-title">{item.title}</span>
          <span className="timeline-description">{item.description}</span>
          {item.badge && <span className="timeline-badge">{item.badge}</span>}
        </li>
      ))}
    </ul>
  );
}
