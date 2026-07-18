import { useDailyBrief } from "../../hooks/useDailyBrief";
import { AlertBanner } from "./AlertBanner";
import { RecoverySection } from "./RecoverySection";
import { FitnessSection } from "./FitnessSection";
import { RecommendationSection } from "./RecommendationSection";
import { InsightsSection } from "./InsightsSection";
import { PredictionsSection } from "./PredictionsSection";
import { UpcomingRacesSection } from "./UpcomingRacesSection";
import { TrainingLoadSection } from "./TrainingLoadSection";
import { TimelineSection } from "./TimelineSection";

/**
 * The Daily Brief -- the home screen, per docs/ARCHITECTURE.md's DEC-0004:
 * "the home screen becomes a Daily Brief instead of a metrics dashboard."
 * Section order: Recovery, Fitness, Today's Recommendation, Insights,
 * Predictions, Upcoming Races, Training Load, Timeline. Alerts are shown
 * above all of them (not one of the 8 sections itself) since
 * COACH_ENGINE.md says "Alerts have higher priority than recommendations."
 */
export function DailyBriefPage() {
  const state = useDailyBrief();

  if (state.status === "loading") {
    return <p className="empty-note">Preparing today's brief…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="error-box">
        <strong>Could not load today's brief.</strong>
        <p>{state.message}</p>
      </div>
    );
  }

  const { brief, insights, racePredictions, recoveryTime, recoveryRecommendations, trainingLoadHistory, timelineEvents } =
    state.viewModel;

  const fitnessTrend = insights.find((i) => i.kind === "trend" && i.metricName === "Fitness (CTL)");

  return (
    <div className="daily-brief">
      <AlertBanner alerts={brief.warnings} />

      <RecoverySection
        score={brief.recovery.score}
        label={brief.recovery.label}
        recoveryTime={recoveryTime}
        recommendations={recoveryRecommendations}
      />

      <FitnessSection score={brief.fitness.score} label={brief.fitness.label} trendExplanation={fitnessTrend?.explanation ?? null} />

      <RecommendationSection recommendation={brief.trainingRecommendation} />

      <InsightsSection insights={insights} />

      <PredictionsSection racePredictions={racePredictions} />

      <UpcomingRacesSection raceCountdown={brief.raceCountdown} />

      <TrainingLoadSection history={trainingLoadHistory} />

      <TimelineSection events={timelineEvents} />
    </div>
  );
}
