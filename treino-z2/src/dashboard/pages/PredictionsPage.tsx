import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Card } from "../../components/ui/Card";
import { ConfidenceBadge } from "../../components/ui/ConfidenceBadge";
import { PredictionCard } from "../components/PredictionCard";
import { usePredictionsPage } from "../hooks/usePredictionsPage";
import { formatDuration } from "../../utils/format";

/**
 * Predictions page: race time forecasts, fitness (CTL) evolution,
 * recovery time and injury risk -- all Prediction Engine output. FTP
 * evolution and goal-achievement probability are shown as explicit
 * EmptyStates rather than fabricated numbers -- see
 * assemblePredictionsView.ts's doc comment and DASHBOARD_REPORT.md's
 * Limitations for exactly what schema gap blocks each one.
 */
export function PredictionsPage() {
  const { state, retry } = usePredictionsPage();

  if (state.status === "loading") return <LoadingState message="Loading predictions…" />;
  if (state.status === "error") return <ErrorState title="Could not load predictions." message={state.message} onRetry={retry} />;

  const { racePredictions, fitnessEvolution, recoveryTime, injuryRisk } = state.data;
  const availableRaces = racePredictions.filter((p) => p.result.value != null);

  return (
    <div className="dashboard">
      <Card title="Race Predictions">
        {availableRaces.length === 0 ? (
          <EmptyState message="No best efforts synced yet -- predictions need at least one recorded race or time trial." />
        ) : (
          <ul className="prediction-list">
            {racePredictions.map(({ label, result }) => (
              <PredictionCard key={label} label={label} prediction={result} formatValue={(v) => formatDuration(v.predictedTimeSec)} />
            ))}
          </ul>
        )}
      </Card>

      <Card title="Fitness Evolution (30-day projection)">
        {fitnessEvolution?.value ? (
          <>
            <p className="brief-statement">
              CTL projected to reach <strong>{fitnessEvolution.value.projectedValue.toFixed(1)}</strong> by {fitnessEvolution.value.projectedDate}.
            </p>
            <div className="confidence-row">
              <ConfidenceBadge confidence={fitnessEvolution.confidence} />
            </div>
            {fitnessEvolution.assumptions.length > 0 && <p className="brief-substatement">{fitnessEvolution.assumptions.join(" ")}</p>}
          </>
        ) : (
          <EmptyState message="Not enough fitness history yet to project a trend." />
        )}
      </Card>

      <Card title="Recovery Time">
        {recoveryTime?.value ? (
          <p className="brief-statement">
            About <strong>{recoveryTime.value.daysUntilRecovered.toFixed(1)} days</strong> until fully recovered at the current fatigue level.
          </p>
        ) : (
          <EmptyState message="Not enough training load data yet." />
        )}
      </Card>

      <Card title="Injury Risk (Acute:Chronic Workload Ratio)">
        {injuryRisk?.value ? (
          <>
            <p className="brief-statement">
              Risk level: <strong>{injuryRisk.value.riskLevel}</strong> (ACWR {injuryRisk.value.acwr.toFixed(2)}, score {injuryRisk.value.riskScore.toFixed(0)}/100).
            </p>
            <div className="confidence-row">
              <ConfidenceBadge confidence={injuryRisk.confidence} />
            </div>
          </>
        ) : (
          <EmptyState message="Not enough training load data yet." />
        )}
      </Card>

      <Card title="Goal Achievement Probability">
        <EmptyState message="Goal probability needs a numeric target value on the goal, which the current schema does not store yet (only a target date) -- see DASHBOARD_REPORT.md." />
      </Card>
    </div>
  );
}
