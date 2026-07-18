export interface WorkoutFeedbackInput {
  plannedKind: string | null;
  plannedRtss: number | null;
  actualRtss: number | null;
  targetZone: string | null;
  actualTargetZonePct: number | null; // % of moving time spent in targetZone
  hrDriftPercent: number | null; // from Metrics Engine's calculateHrDrift
}

/**
 * "Workout Analysis" (COACH_ENGINE.md p.48-49): "After every activity the
 * Coach must answer: What was the goal? Was the goal achieved? What
 * improved? What needs attention? How does this affect the current
 * training block? How should tomorrow's training change?"
 */
export interface WorkoutFeedback {
  goal: string;
  goalAchieved: boolean | null;
  improvements: string[];
  concerns: string[];
  trainingBlockImpact: string;
  tomorrowAdjustment: string;
  confidence: number;
}

// The ratio bands below (rTSS actual : rTSS planned) match the convention
// already used by this project's legacy dashboard (index.html's
// analyzeExecution): 0.85-1.15 is "well executed," above 1.15 is "harder
// than planned," 0.6-0.85 is "below plan," and below 0.6 is "well below
// plan." Reused here rather than re-derived, for consistency with how
// this athlete's execution has always been evaluated.
const WELL_EXECUTED_MIN = 0.85;
const WELL_EXECUTED_MAX = 1.15;
const BELOW_PLAN_MIN = 0.6;

const HIGH_HR_DRIFT_PERCENT = 5; // above this, aerobic decoupling is worth flagging

export function analyzeWorkout(input: WorkoutFeedbackInput): WorkoutFeedback {
  const { plannedKind, plannedRtss, actualRtss, targetZone, actualTargetZonePct, hrDriftPercent } = input;

  const goal = plannedKind ? `Complete a ${plannedKind} session${targetZone ? ` targeting ${targetZone}` : ""}.` : "No workout was planned for this session.";

  const improvements: string[] = [];
  const concerns: string[] = [];
  let goalAchieved: boolean | null = null;
  let ratio: number | null = null;

  if (plannedRtss != null && plannedRtss > 0 && actualRtss != null) {
    ratio = actualRtss / plannedRtss;
    goalAchieved = ratio >= WELL_EXECUTED_MIN && ratio <= WELL_EXECUTED_MAX;
  }

  if (targetZone != null && actualTargetZonePct != null) {
    if (actualTargetZonePct >= 60) improvements.push(`Spent ${actualTargetZonePct.toFixed(0)}% of the session in the target zone (${targetZone}).`);
    else concerns.push(`Only ${actualTargetZonePct.toFixed(0)}% of the session was in the target zone (${targetZone}).`);
  }

  if (hrDriftPercent != null) {
    if (hrDriftPercent <= 0) improvements.push("No cardiac decoupling -- pace held with a stable or improving HR relationship.");
    else if (hrDriftPercent > HIGH_HR_DRIFT_PERCENT) concerns.push(`HR Drift was ${hrDriftPercent.toFixed(1)}%, higher than expected for this session.`);
  }

  let trainingBlockImpact: string;
  let tomorrowAdjustment: string;

  if (ratio == null) {
    trainingBlockImpact = "No planned target to compare against, so this session's impact on the current block can't be assessed.";
    tomorrowAdjustment = "No adjustment indicated; proceed with the planned schedule.";
  } else if (ratio > WELL_EXECUTED_MAX) {
    trainingBlockImpact = "This session added more load than planned, pulling the block's cumulative fatigue slightly ahead of schedule.";
    tomorrowAdjustment = "Consider an easier session tomorrow to let fatigue settle back toward plan.";
  } else if (ratio >= WELL_EXECUTED_MIN) {
    trainingBlockImpact = "This session executed as planned; the current training block remains on schedule.";
    tomorrowAdjustment = "Proceed with the planned schedule.";
  } else if (ratio >= BELOW_PLAN_MIN) {
    trainingBlockImpact = "This session came in below plan, slightly behind the block's intended load.";
    tomorrowAdjustment = "No change needed if this was a one-off; consider a make-up session later this week if it becomes a pattern.";
  } else {
    trainingBlockImpact = "This session was well below the planned load, meaningfully behind the block's intended stimulus.";
    tomorrowAdjustment = "Investigate the cause (fatigue, external factors) before deciding whether to make up the missed load.";
  }

  const confidence = ratio != null ? 0.8 : 0.4;

  return { goal, goalAchieved, improvements, concerns, trainingBlockImpact, tomorrowAdjustment, confidence };
}
