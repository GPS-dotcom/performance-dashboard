export interface FitnessSectionProps {
  score: number | null;
  label: string;
  trendExplanation: string | null;
}

/** Answers: "Am I getting fitter?" */
export function FitnessSection({ score, label, trendExplanation }: FitnessSectionProps) {
  const statusSentence =
    score == null ? "Not enough training history yet to estimate fitness." : `Fitness is ${label} (${score.toFixed(0)}%).`;

  return (
    <section className="brief-section">
      <div className="brief-section-label">Fitness</div>
      <p className="brief-statement">{statusSentence}</p>
      {trendExplanation && <p className="brief-substatement">{trendExplanation}</p>}
    </section>
  );
}
