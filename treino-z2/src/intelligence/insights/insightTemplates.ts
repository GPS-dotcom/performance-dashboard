// Every title/description string this engine ever produces is assembled
// here, from typed parameters, and nowhere else -- "Nenhum texto deve
// ser gerado diretamente": no analyzer/detector builds prose inline: it
// calls one of these functions and passes the result to insightBuilder.
// Title text quoted in comments is copied verbatim from
// 19_INSIGHTS_LIBRARY.md where that exact insight name exists there;
// insights this engine adds beyond the library's catalog are named to
// read consistently with it, and say so.

function pct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// ---- Trend (shared by trendAnalyzer's 5 sub-capabilities and performanceAnalyzer's evolution-by-distance/power/pace) ----

export function trendImprovingTemplate(metricLabel: string, slopePerWeek: number, points: number) {
  return {
    title: `${metricLabel} Improving`,
    description: `${metricLabel} has been improving (${slopePerWeek >= 0 ? "+" : ""}${slopePerWeek.toFixed(2)} per week) over the last ${points} data points.`,
  };
}

export function trendDecliningTemplate(metricLabel: string, slopePerWeek: number, points: number) {
  return {
    title: `${metricLabel} Declining`,
    description: `${metricLabel} has been declining (${slopePerWeek.toFixed(2)} per week) over the last ${points} data points.`,
  };
}

export function trendStableTemplate(metricLabel: string, points: number) {
  return {
    title: `${metricLabel} Stable`,
    description: `${metricLabel} has been stable over the last ${points} data points.`,
  };
}

// ---- Plateau / regression / acceleration (detectors/plateauDetector.ts) ----

/** 19_INSIGHTS_LIBRARY.md: "Performance Plateau -- No meaningful improvement over a defined period." */
export function plateauTemplate(metricLabel: string, windowSize: number, meanValue: number) {
  return {
    title: `${metricLabel} Plateau`,
    description: `${metricLabel} has plateaued around ${meanValue.toFixed(2)} over the last ${windowSize} data points.`,
  };
}

/** 19_INSIGHTS_LIBRARY.md: "Declining Performance -- Multiple negative trends." */
export function regressionTemplate(metricLabel: string, windowSize: number, slopePerWeek: number) {
  return {
    title: `${metricLabel} Declining`,
    description: `${metricLabel} has declined (${slopePerWeek.toFixed(2)} per week) over the most recent ${windowSize} data points, a sharper drop than the series' overall trend.`,
  };
}

/** Not in 19_INSIGHTS_LIBRARY.md's named catalog -- added for the explicitly requested "evolução acelerada" capability, named to read consistently with the library's style. */
export function accelerationTemplate(metricLabel: string, windowSize: number, recentSlopePerWeek: number, overallSlopePerWeek: number) {
  return {
    title: `${metricLabel} Accelerating`,
    description: `${metricLabel} has been improving faster recently (${recentSlopePerWeek.toFixed(2)}/week over the last ${windowSize} points) than its overall trend (${overallSlopePerWeek.toFixed(2)}/week).`,
  };
}

// ---- Consistency ----

/** 19_INSIGHTS_LIBRARY.md: "Excellent Training Consistency -- Few missed sessions. Stable volume." */
export function excellentConsistencyTemplate(activeWeeks: number, totalWeeks: number) {
  return {
    title: "Excellent Training Consistency",
    description: `Trained in ${activeWeeks} of the last ${totalWeeks} weeks, with stable weekly volume.`,
  };
}

/** 19_INSIGHTS_LIBRARY.md: "Reduced Consistency -- Training interruptions detected." */
export function reducedConsistencyTemplate(missedWeeks: number, totalWeeks: number) {
  return {
    title: "Reduced Consistency",
    description: `${missedWeeks} of the last ${totalWeeks} weeks had no recorded training -- interruptions may be slowing adaptation.`,
  };
}

export function planAdherenceStrongTemplate(adherenceRatio: number, weeks: number) {
  return {
    title: "Plan Adherence Strong",
    description: `Completed ${(adherenceRatio * 100).toFixed(0)}% of planned sessions over the last ${weeks} weeks.`,
  };
}

export function planAdherenceWeakTemplate(adherenceRatio: number, weeks: number) {
  return {
    title: "Plan Adherence Weak",
    description: `Only ${(adherenceRatio * 100).toFixed(0)}% of planned sessions were completed over the last ${weeks} weeks.`,
  };
}

export function volumeStableTemplate(coefficientOfVariation: number, weeks: number) {
  return {
    title: "Training Volume Stable",
    description: `Weekly training volume has stayed consistent over the last ${weeks} weeks (variation ${(coefficientOfVariation * 100).toFixed(0)}%).`,
  };
}

export function volumeIrregularTemplate(coefficientOfVariation: number, weeks: number) {
  return {
    title: "Training Volume Irregular",
    description: `Weekly training volume has swung significantly over the last ${weeks} weeks (variation ${(coefficientOfVariation * 100).toFixed(0)}%).`,
  };
}

export function regularTrainingPatternTemplate(weeks: number) {
  return {
    title: "Regular Training Pattern",
    description: `No gap longer than one week without training over the last ${weeks} weeks.`,
  };
}

export function trainingInterruptionTemplate(gapWeeks: number) {
  return {
    title: "Training Interruption Detected",
    description: `A gap of ${gapWeeks} consecutive weeks without any recorded training was detected.`,
  };
}

// ---- Fatigue ----

export function accumulatedFatigueTemplate(tsb: number, consecutiveDays: number) {
  return {
    title: "Accumulated Fatigue",
    description: `Training Stress Balance has been at or below ${tsb.toFixed(1)} for ${consecutiveDays} consecutive days -- fatigue is currently outweighing fitness.`,
  };
}

export function insufficientRecoveryTemplate(tsb: number, windowDays: number) {
  return {
    title: "Insufficient Recovery Time",
    description: `Training Stress Balance has stayed negative (currently ${tsb.toFixed(1)}) without recovering over the last ${windowDays} days -- sessions aren't leaving enough room to rebuild.`,
  };
}

/** Close to 19_INSIGHTS_LIBRARY.md's "Rapid Load Increase -- Weekly load spike." */
export function excessLoadTemplate(increasePercent: number) {
  return {
    title: "Excessive Training Load Increase",
    description: `Acute training load rose ${pct(increasePercent)} week-over-week -- a rapid increase relative to what the athlete has been adapted to.`,
  };
}

// ---- Recovery ----

export function recoveryAboveExpectedTemplate(recoverySlopePerWeek: number, tsbSlopePerWeek: number) {
  return {
    title: "Recovery Above Expected",
    description: `Recovery Score is improving (${recoverySlopePerWeek.toFixed(2)}/week) faster than Training Stress Balance's own trend (${tsbSlopePerWeek.toFixed(2)}/week) would predict -- recovery is outperforming the training load pattern.`,
  };
}

/** 19_INSIGHTS_LIBRARY.md: "Recovery Incomplete -- Elevated fatigue. High ATL. Declining Recovery Score." */
export function recoveryBelowExpectedTemplate(recoverySlopePerWeek: number, tsbSlopePerWeek: number) {
  return {
    title: "Recovery Below Expected",
    description: `Recovery Score (${recoverySlopePerWeek.toFixed(2)}/week) is trailing what Training Stress Balance's own trend (${tsbSlopePerWeek.toFixed(2)}/week) would predict -- something beyond training load may be limiting recovery.`,
  };
}

// ---- Performance ----

/** 19_INSIGHTS_LIBRARY.md: "New Personal Best -- Examples: Fastest, Longest, Highest Power, Lowest HR Drift, Best Marathon Prediction." */
export function newPersonalBestTemplate(distanceLabel: string, timeSec: number, previousTimeSec: number | null) {
  const improvement = previousTimeSec != null ? `, improving on the previous best of ${previousTimeSec.toFixed(0)}s` : " (first recorded effort at this distance)";
  return {
    title: "New Personal Best",
    description: `New best effort at ${distanceLabel}: ${timeSec.toFixed(0)}s${improvement}.`,
  };
}

// ---- Training Block ----

/** 19_INSIGHTS_LIBRARY.md: "Best Training Block -- Current block exceeds historical averages." */
export function bestTrainingBlockTemplate(label: string, metricLabel: string, marginPercent: number) {
  return {
    title: "Best Training Block",
    description: `"${label}" has the highest average ${metricLabel} of the compared blocks (${pct(marginPercent)} above the next best).`,
  };
}

export function periodComparisonImprovedTemplate(metricLabel: string, labelA: string, labelB: string, meanA: number, meanB: number) {
  return {
    title: `${metricLabel} Improved`,
    description: `${metricLabel} averaged ${meanB.toFixed(2)} in "${labelB}" vs. ${meanA.toFixed(2)} in "${labelA}" (${pct(meanA !== 0 ? ((meanB - meanA) / Math.abs(meanA)) * 100 : 0)}).`,
  };
}

export function periodComparisonDeclinedTemplate(metricLabel: string, labelA: string, labelB: string, meanA: number, meanB: number) {
  return {
    title: `${metricLabel} Declined`,
    description: `${metricLabel} averaged ${meanB.toFixed(2)} in "${labelB}" vs. ${meanA.toFixed(2)} in "${labelA}" (${pct(meanA !== 0 ? ((meanB - meanA) / Math.abs(meanA)) * 100 : 0)}).`,
  };
}

// ---- Shoe / Equipment ----

/** 19_INSIGHTS_LIBRARY.md: "Shoe Replacement Recommended -- Evidence: Mileage threshold reached." */
export function shoeReplacementRecommendedTemplate(shoeName: string, mileageKm: number, thresholdKm: number) {
  return {
    title: "Shoe Replacement Recommended",
    description: `${shoeName} has ${mileageKm.toFixed(0)}km, past the ${thresholdKm}km guideline where midsole cushioning typically degrades.`,
  };
}

export function shoeApproachingReplacementTemplate(shoeName: string, mileageKm: number, thresholdKm: number) {
  return {
    title: "Shoe Approaching Replacement",
    description: `${shoeName} has ${mileageKm.toFixed(0)}km, approaching the ${thresholdKm}km guideline for midsole replacement.`,
  };
}

/** 19_INSIGHTS_LIBRARY.md: "Performance Difference Between Shoes -- System detected measurable differences between equipment." */
export function performanceDifferenceBetweenShoesTemplate(shoeA: string, shoeB: string, metricLabel: string, differencePercent: number) {
  return {
    title: "Performance Difference Between Shoes",
    description: `${metricLabel} differs by ${pct(differencePercent)} between ${shoeA} and ${shoeB}.`,
  };
}

/** 19_INSIGHTS_LIBRARY.md: "New Shoe Personal Best -- New equipment associated with improved performance." */
export function newShoePersonalBestTemplate(shoeName: string, distanceLabel: string) {
  return {
    title: "New Shoe Personal Best",
    description: `Set a new personal best at ${distanceLabel} wearing ${shoeName}.`,
  };
}
