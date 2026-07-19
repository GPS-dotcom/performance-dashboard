import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Card } from "../../components/ui/Card";
import { InsightCard } from "../components/InsightCard";
import { useShoesPage } from "../hooks/useShoesPage";

/**
 * Shoes page: mileage, wear, replacement forecast and history per shoe,
 * from the Intelligence Engine's shoeAnalyzer. `strava_activities` has no
 * gear column yet (see assembleShoesView.ts), so this always renders
 * empty today -- the History module's Shoes Manager (Phase B) is scoped
 * to add gear tracking, at which point this page needs no changes.
 */
export function ShoesPage() {
  const { state, retry } = useShoesPage();

  if (state.status === "loading") return <LoadingState message="Loading shoes…" />;
  if (state.status === "error") return <ErrorState title="Could not load shoes." message={state.message} onRetry={retry} />;

  const { usageSummaries, wearInsights, performanceDifference, newPersonalBests, hasGearData } = state.data;

  if (!hasGearData) {
    return (
      <div className="dashboard">
        <Card title="Shoes">
          <EmptyState
            message="Shoe/gear tracking isn't recorded in the current schema yet."
            action="This page will populate automatically once the History module's Shoes Manager adds gear data to activities."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Card title="Usage">
        {usageSummaries.length === 0 ? (
          <EmptyState message="No shoe usage recorded yet." />
        ) : (
          <ul className="dash-plain-list">
            {usageSummaries.map((s) => (
              <li key={s.shoe}>
                {s.shoe}: {s.activityCount} activities, {s.totalDistanceKm.toFixed(0)}km
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Wear & Replacement">
        {wearInsights.length === 0 ? (
          <EmptyState message="No shoe is approaching its replacement mileage yet." />
        ) : (
          <ul className="insight-list">
            {wearInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        )}
      </Card>

      <Card title="Performance Comparison">
        {performanceDifference ? (
          <ul className="insight-list">
            <InsightCard insight={performanceDifference} />
          </ul>
        ) : (
          <EmptyState message="Not enough data across two shoes to compare yet." />
        )}
      </Card>

      <Card title="New Personal Bests">
        {newPersonalBests.length === 0 ? (
          <EmptyState message="No personal bests set on a new shoe today." />
        ) : (
          <ul className="insight-list">
            {newPersonalBests.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
