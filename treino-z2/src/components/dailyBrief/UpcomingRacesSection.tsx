import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";

export interface UpcomingRacesSectionProps {
  raceCountdown: { raceName: string; daysUntil: number } | null;
}

/** Answers: "How much time do I have?" */
export function UpcomingRacesSection({ raceCountdown }: UpcomingRacesSectionProps) {
  return (
    <Card title="Upcoming Races">
      {raceCountdown == null ? (
        <EmptyState message="No upcoming race set." action="Add a goal to see a countdown here." />
      ) : (
        <p className="brief-statement">
          <strong>{raceCountdown.daysUntil}</strong> day{raceCountdown.daysUntil === 1 ? "" : "s"} until {raceCountdown.raceName}.
        </p>
      )}
    </Card>
  );
}
