import type { RawStravaActivity } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Per 06_ACTIVITY_ENGINE.md: "Supported Activity Types -- Current: Run."
const SUPPORTED_SPORT_TYPES = new Set(["Run"]);

/**
 * Validation Rules (06_ACTIVITY_ENGINE.md):
 *   Required: Athlete ID, Activity ID, Sport Type, Start Time, Duration.
 *   Optional: Power, Heart Rate, GPS, Cadence, Elevation.
 * "Invalid activities are rejected."
 */
export function validateRawActivity(raw: RawStravaActivity, athleteId: string | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (!athleteId) errors.push("Missing Athlete ID.");
  if (raw.id == null || raw.id === "") errors.push("Missing Provider Activity ID.");

  const sportType = raw.sport_type ?? raw.type;
  if (!sportType) {
    errors.push("Missing Sport Type.");
  } else if (!SUPPORTED_SPORT_TYPES.has(sportType)) {
    errors.push(`Unsupported Sport Type "${sportType}".`);
  }

  if (!raw.start_date) errors.push("Missing Start Time.");

  const duration = raw.moving_time ?? raw.elapsed_time;
  if (duration == null || duration <= 0) errors.push("Missing or invalid Duration.");

  return { valid: errors.length === 0, errors };
}
