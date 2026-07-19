import type { LactateStage, LactateThreshold } from "../../models/lactateStage";
import { metricResult, unavailableMetric, type MetricResult } from "../../types/metricResult";

function sortedStages(stages: LactateStage[]): LactateStage[] {
  return [...stages].sort((a, b) => a.stageNumber - b.stageNumber);
}

function intensityOf(stage: LactateStage): { value: number; unit: "speed_mps" | "power_watts" } | null {
  if (stage.speedMps != null) return { value: stage.speedMps, unit: "speed_mps" };
  if (stage.powerWatts != null) return { value: stage.powerWatts, unit: "power_watts" };
  return null;
}

/**
 * Linear interpolation between the two stages of an incremental lactate
 * test bracketing `targetMmol`. Assumes blood lactate rises monotonically
 * with stage, as it should in a correctly administered test. Shared by
 * lt1Calculator (target 2.0 mmol/L) and lt2Calculator (target 4.0
 * mmol/L) -- the two thresholds differ only in which blood-lactate
 * concentration they interpolate to, so the interpolation itself lives
 * in exactly one place.
 */
export function interpolateAtLactate(stages: LactateStage[], targetMmol: number): LactateThreshold | null {
  const sorted = sortedStages(stages).filter((s) => intensityOf(s) != null);
  if (sorted.length < 2) return null;

  const exact = sorted.find((s) => s.bloodLactateMmol === targetMmol);
  if (exact) {
    const intensity = intensityOf(exact)!;
    return { intensity: intensity.value, intensityUnit: intensity.unit, heartRate: exact.heartRate ?? null };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (lo.bloodLactateMmol > targetMmol || targetMmol > hi.bloodLactateMmol) continue;

    const range = hi.bloodLactateMmol - lo.bloodLactateMmol;
    if (range === 0) continue;
    const fraction = (targetMmol - lo.bloodLactateMmol) / range;

    const loIntensity = intensityOf(lo);
    const hiIntensity = intensityOf(hi);
    if (!loIntensity || !hiIntensity || loIntensity.unit !== hiIntensity.unit) return null;

    const intensity = loIntensity.value + fraction * (hiIntensity.value - loIntensity.value);
    const heartRate =
      lo.heartRate != null && hi.heartRate != null ? lo.heartRate + fraction * (hi.heartRate - lo.heartRate) : null;

    return { intensity, intensityUnit: loIntensity.unit, heartRate };
  }

  return null; // target lactate falls outside the tested range -- extrapolation is unsafe
}

/** Wraps interpolateAtLactate in the MetricResult envelope, shared by lt1Calculator/lt2Calculator. */
export function lactateThresholdResult(stages: LactateStage[], targetMmol: number): MetricResult<LactateThreshold> {
  const requiredInputs = ["lactate_test_stages (>= 2, each with speed_mps or power_watts, and blood_lactate_mmol)"];
  if (stages.length < 2) return unavailableMetric(requiredInputs, ["fewer than 2 stages"]);

  const result = interpolateAtLactate(stages, targetMmol);
  if (!result) {
    return unavailableMetric(requiredInputs, [`no pair of stages brackets ${targetMmol} mmol/L`]);
  }

  const missingInputs = result.heartRate == null ? ["heart_rate on the bracketing stages"] : [];
  const dataQuality = stages.length >= 4 ? "high" : "medium";
  const confidence = stages.length >= 4 ? 0.85 : 0.65;

  return metricResult(result, confidence, dataQuality, requiredInputs, missingInputs);
}
