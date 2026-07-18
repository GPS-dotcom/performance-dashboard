export interface UpcomingRacesSectionProps {
  raceCountdown: { raceName: string; daysUntil: number } | null;
}

/** Answers: "How much time do I have?" */
export function UpcomingRacesSection({ raceCountdown }: UpcomingRacesSectionProps) {
  return (
    <section className="brief-section">
      <div className="brief-section-label">Upcoming Races</div>
      {raceCountdown == null ? (
        <p className="empty-note">No upcoming race set.</p>
      ) : (
        <p className="brief-statement">
          <strong>{raceCountdown.daysUntil}</strong> day{raceCountdown.daysUntil === 1 ? "" : "s"} until {raceCountdown.raceName}.
        </p>
      )}
    </section>
  );
}
