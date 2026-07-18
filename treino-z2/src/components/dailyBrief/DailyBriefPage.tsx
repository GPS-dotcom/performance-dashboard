import { useDailyBrief } from "../../hooks/useDailyBrief";
import { LoadingState } from "../ui/LoadingState";
import { ErrorState } from "../ui/ErrorState";
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
  const { state, retry } = useDailyBrief();

  if (state.status === "loading") {
    return <LoadingState message="Preparing today's brief…" />;
  }

  if (state.status === "error") {
    return <ErrorState title="Could not load today's brief." message={state.message} onRetry={retry} />;
  }

  const { brief, insights, racePredictions, recoveryTime, recoveryRecommendations, trainingLoadHistory, timelineEvents } =
    state.viewModel;

  const fitnessTrend = insights.find((i) => i.category === "fitness" && i.relatedMetrics.includes("ctl"));

  return (
    <div className="daily-brief">
      <AlertBanner alerts={brief.warnings} />

      <RecoverySection
        score={brief.recovery.score}
        label={brief.recovery.label}
        recoveryTime={recoveryTime}
        recommendations={recoveryRecommendations}
      />

      <FitnessSection score={brief.fitness.score} label={brief.fitness.label} trendExplanation={fitnessTrend?.description ?? null} />

      <RecommendationSection recommendation={brief.trainingRecommendation} />

      <InsightsSection insights={insights} />

      <PredictionsSection racePredictions={racePredictions} />

      <UpcomingRacesSection raceCountdown={brief.raceCountdown} />

      <TrainingLoadSection history={trainingLoadHistory} />

      <TimelineSection events={timelineEvents} />
    </div>
  );
}
