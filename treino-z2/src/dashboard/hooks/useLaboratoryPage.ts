import { useCallback, useEffect, useState } from "react";
import { computeLactateThresholds } from "../../metrics";
import type { LactateThresholdsResult } from "../../metrics";
import { fetchLactateTests } from "../services/laboratoryService";
import type { LactateTestSummary } from "../services/laboratoryService";
import { useAthleteData } from "./useAthleteData";
import type { LoadState } from "../types";

export interface LaboratoryViewModel {
  tests: LactateTestSummary[];
  selectedTestId: string | null;
  thresholds: LactateThresholdsResult | null;
  thresholdsLoading: boolean;
}

/**
 * Laboratory page: lists recorded lactate tests (the only Laboratory test
 * type this schema stores today -- see DASHBOARD_REPORT.md's Limitations
 * for FTP/Critical Power/VO2/Cooper/Time Trial/Body Composition/Blood
 * Exam tests, which the History module's Laboratory sub-module (Phase B)
 * is scoped to add tables for) and, on selection, computes that test's
 * LT1/LT2 via the Metrics Engine's own lactateThresholdService -- never
 * recomputed here.
 */
export function useLaboratoryPage(): {
  state: LoadState<LaboratoryViewModel>;
  retry: () => void;
  selectTest: (testId: string) => void;
} {
  const { state: athleteState, retry } = useAthleteData();
  const [tests, setTests] = useState<LactateTestSummary[] | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<LactateThresholdsResult | null>(null);
  const [thresholdsLoading, setThresholdsLoading] = useState(false);

  const athleteId = athleteState.status === "ready" ? athleteState.data.athlete?.id : undefined;

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    fetchLactateTests(athleteId).then((result) => {
      if (!cancelled) setTests(result);
    });
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const selectTest = useCallback((testId: string) => {
    setSelectedTestId(testId);
    setThresholdsLoading(true);
    computeLactateThresholds(testId)
      .then((result) => setThresholds(result))
      .catch(() => setThresholds(null))
      .finally(() => setThresholdsLoading(false));
  }, []);

  if (athleteState.status !== "ready") return { state: athleteState, retry, selectTest };
  if (!athleteId) return { state: { status: "ready", data: { tests: [], selectedTestId: null, thresholds: null, thresholdsLoading: false } }, retry, selectTest };
  if (tests === null) return { state: { status: "loading" }, retry, selectTest };

  return { state: { status: "ready", data: { tests, selectedTestId, thresholds, thresholdsLoading } }, retry, selectTest };
}
