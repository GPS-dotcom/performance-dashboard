import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Card } from "../../components/ui/Card";
import { useLaboratoryPage } from "../hooks/useLaboratoryPage";

/**
 * Laboratory page: recorded lactate tests and, on selection, their
 * LT1/LT2 (Metrics Engine's lactateThresholdService, never recomputed
 * here). This schema stores only lactate tests today -- FTP Test,
 * Critical Power Test, VO2 Test, Cooper Test, Time Trial, Body
 * Composition and Blood Exams all need dedicated tables the History
 * module's Laboratory sub-module (Phase B) is scoped to add, per
 * DASHBOARD_REPORT.md's Limitations.
 */
export function LaboratoryPage() {
  const { state, retry, selectTest } = useLaboratoryPage();

  if (state.status === "loading") return <LoadingState message="Loading laboratory…" />;
  if (state.status === "error") return <ErrorState title="Could not load laboratory data." message={state.message} onRetry={retry} />;

  const { tests, thresholds, thresholdsLoading } = state.data;

  return (
    <div className="dashboard">
      <Card title="Lactate Tests">
        {tests.length === 0 ? (
          <EmptyState message="No lactate tests recorded yet." />
        ) : (
          <ul className="dash-plain-list">
            {tests.map((test) => (
              <li key={test.id}>
                <button type="button" className="dash-link-button" onClick={() => selectTest(test.id)}>
                  {test.testDate} — {test.testType} test{test.notes ? `: ${test.notes}` : ""}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="LT1 / LT2">
        {thresholdsLoading ? (
          <LoadingState message="Computing thresholds…" />
        ) : thresholds?.lt1.value || thresholds?.lt2.value ? (
          <ul className="dash-plain-list">
            {thresholds.lt1.value && (
              <li>
                LT1: {thresholds.lt1.value.intensity.toFixed(2)} {thresholds.lt1.value.intensityUnit}
                {thresholds.lt1.value.heartRate != null ? ` (${thresholds.lt1.value.heartRate.toFixed(0)}bpm)` : ""}
              </li>
            )}
            {thresholds.lt2.value && (
              <li>
                LT2: {thresholds.lt2.value.intensity.toFixed(2)} {thresholds.lt2.value.intensityUnit}
                {thresholds.lt2.value.heartRate != null ? ` (${thresholds.lt2.value.heartRate.toFixed(0)}bpm)` : ""}
              </li>
            )}
          </ul>
        ) : (
          <EmptyState message="Select a test above to compute its LT1/LT2." />
        )}
      </Card>

      <Card title="Other Test Types">
        <EmptyState message="FTP Test, Critical Power Test, VO2 Test, Cooper Test, Time Trial, Body Composition and Blood Exams aren't stored yet -- coming with the History module's Laboratory sub-module." />
      </Card>
    </div>
  );
}
