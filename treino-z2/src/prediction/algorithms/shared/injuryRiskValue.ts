// Shared by every Injury Risk Predictor algorithm (acute load, monotony,
// accumulated fatigue) -- all three answer the same shape of question
// ("how risky, on a 0-100 scale, with which qualitative level") from
// different signals, so the output shape exists in exactly one place.

export interface InjuryRiskValue {
  /** 0-100. */
  riskScore: number;
  riskLevel: "low" | "moderate" | "high";
}
