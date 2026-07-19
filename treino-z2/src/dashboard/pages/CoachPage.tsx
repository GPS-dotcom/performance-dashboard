import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Card } from "../../components/ui/Card";
import { RecommendationCard } from "../components/RecommendationCard";
import { AlertCard } from "../components/AlertCard";
import { useCoachPage } from "../hooks/useCoachPage";

/**
 * Coach page: today's recommendations/alerts (priorities), the Weekly
 * Coach Report, and persisted recommendation/alert history -- all Coach
 * Engine output, presented as-is. Priorities are sorted by `priority`
 * (1 = most urgent) since that ordering is exactly what "prioridades"
 * asks for and the Coach Engine already assigns it; nothing here
 * re-ranks or re-derives it.
 */
export function CoachPage() {
  const { state, retry } = useCoachPage();

  if (state.status === "loading") return <LoadingState message="Loading coach…" />;
  if (state.status === "error") return <ErrorState title="Could not load the coach." message={state.message} onRetry={retry} />;

  const { recommendations, alerts, weeklyReport, recommendationHistory, alertHistory } = state.data;
  const sortedRecommendations = [...recommendations].sort((a, b) => a.priority - b.priority);

  return (
    <div className="dashboard">
      {alerts.length > 0 && (
        <Card title="Alerts">
          <div className="alert-banner">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </Card>
      )}

      <Card title="Today's Priorities">
        {sortedRecommendations.length === 0 ? (
          <EmptyState message="No recommendations right now." />
        ) : (
          <ul className="dash-recommendation-list">
            {sortedRecommendations.map((r) => (
              <RecommendationCard key={r.id} recommendation={r} />
            ))}
          </ul>
        )}
      </Card>

      <Card title="Weekly Plan">
        {weeklyReport ? (
          <>
            <p className="brief-statement">{weeklyReport.summary || `${weeklyReport.weekStart} – ${weeklyReport.weekEnd}`}</p>
            <ul className="evidence-list">
              {weeklyReport.evolution.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {weeklyReport.strengths.length > 0 && (
              <>
                <h3 className="dash-subheading">Strengths</h3>
                <ul className="evidence-list">
                  {weeklyReport.strengths.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </>
            )}
            {weeklyReport.weaknesses.length > 0 && (
              <>
                <h3 className="dash-subheading">Weaknesses</h3>
                <ul className="evidence-list">
                  {weeklyReport.weaknesses.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </>
            )}
            {weeklyReport.nextWeekPriorities.length > 0 && (
              <>
                <h3 className="dash-subheading">Next Week's Priorities</h3>
                <ul className="evidence-list">
                  {weeklyReport.nextWeekPriorities.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <EmptyState message="No activity recorded this week yet." />
        )}
      </Card>

      <Card title="History">
        {recommendationHistory.length === 0 && alertHistory.length === 0 ? (
          <EmptyState message="No persisted recommendation/alert history yet -- nothing has run the Coach Engine's own persistence job for this athlete." />
        ) : (
          <>
            <ul className="dash-recommendation-list">
              {recommendationHistory.map((r) => (
                <RecommendationCard key={r.id} recommendation={r} />
              ))}
            </ul>
            <div className="alert-banner">
              {alertHistory.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
