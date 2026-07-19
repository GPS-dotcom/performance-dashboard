import { getSupabase } from "../../api/supabaseClient";
import { validateRawActivity } from "./validateActivity";
import {
  bestPaceFromLaps,
  normalizeStravaActivity,
  normalizeStravaLaps,
  normalizeStravaStreams,
} from "./normalizeStravaActivity";
import { emitActivityEvent } from "./eventBus";
import type {
  ActivityEngineResult,
  ActivityEventType,
  NormalizedActivity,
  NormalizedLap,
  NormalizedRecord,
  RawStravaActivity,
  RawStravaLap,
  RawStravaStreams,
} from "./types";

export interface ImportActivityInput {
  athleteId: string;
  activity: RawStravaActivity;
  laps?: RawStravaLap[];
  streams?: RawStravaStreams;
}

function toActivityRow(normalized: NormalizedActivity, status: "validated" | "processed" | "failed") {
  return {
    athlete_id: normalized.athleteId,
    provider: normalized.provider,
    external_id: normalized.externalId,
    name: normalized.name,
    description: normalized.description,
    type: normalized.sportType,
    start_date: normalized.startTime,
    timezone: normalized.timezone,
    moving_time_s: normalized.movingTime,
    elapsed_time_s: normalized.elapsedTime,
    distance_m: normalized.distance,
    average_pace_sec_per_km: normalized.averagePaceSecPerKm,
    best_pace_sec_per_km: normalized.bestPaceSecPerKm,
    average_watts: normalized.averagePower,
    max_power: normalized.maxPower,
    average_heartrate: normalized.averageHeartRate,
    max_heartrate: normalized.maxHeartRate,
    average_cadence: normalized.averageCadence,
    max_cadence: normalized.maxCadence,
    elevation_gain_m: normalized.elevationGain,
    elevation_loss_m: normalized.elevationLoss,
    elevation_highest_m: normalized.elevationHighest,
    elevation_lowest_m: normalized.elevationLowest,
    shoe: normalized.shoe,
    map_polyline: normalized.mapPolyline,
    status,
  };
}

function toLapRow(activityId: string, lap: NormalizedLap) {
  return {
    activity_id: activityId,
    lap_number: lap.lapNumber,
    distance_m: lap.distanceM,
    duration_s: lap.durationS,
    pace_sec_per_km: lap.paceSecPerKm,
    power: lap.power,
    heart_rate: lap.heartRate,
    cadence: lap.cadence,
    elevation_m: lap.elevationM,
  };
}

function toRecordRow(activityId: string, record: NormalizedRecord) {
  return {
    activity_id: activityId,
    sequence_index: record.sequenceIndex,
    recorded_at: record.recordedAt,
    latitude: record.latitude,
    longitude: record.longitude,
    altitude_m: record.altitudeM,
    speed_mps: record.speedMps,
    pace_sec_per_km: record.paceSecPerKm,
    power: record.power,
    heart_rate: record.heartRate,
    cadence: record.cadence,
  };
}

/**
 * Publishes an Activity Engine event both durably (the `activity_events`
 * table -- source of truth, survives across sessions/devices) and
 * in-process (eventBus -- reaches same-session subscribers immediately).
 * A failure to persist the durable log is itself logged, per "Failures
 * are logged and never silently ignored," but does not override the
 * caller's own result.
 */
async function publishEvent(
  athleteId: string,
  activityId: string | null,
  eventType: ActivityEventType,
  data: Record<string, unknown>,
): Promise<void> {
  emitActivityEvent({ athleteId, activityId, eventType, data });

  const { error } = await getSupabase()
    .from("activity_events")
    .insert({ athlete_id: athleteId, activity_id: activityId, event_type: eventType, payload: data });

  if (error) {
    console.error(`[ActivityEngine] failed to persist "${eventType}" event:`, error, { athleteId, activityId });
  }
}

/**
 * Activity Lifecycle (06_ACTIVITY_ENGINE.md):
 *   External Provider -> Sync Engine -> Activity Engine -> Validation ->
 *   Normalization -> Persistence -> Event Published.
 *
 * Idempotent: re-importing the same provider activity (same athlete +
 * provider + external id) upserts rather than duplicating, satisfying
 * "Idempotent Processing" / "Avoid duplicate processing."
 *
 * Does not calculate any physiological metric -- only structural fields.
 */
export async function importActivity(input: ImportActivityInput): Promise<ActivityEngineResult> {
  const { athleteId, activity, laps, streams } = input;

  const validation = validateRawActivity(activity, athleteId);
  if (!validation.valid) {
    await publishEvent(athleteId, null, "activity_validation_failed", {
      externalId: activity.id,
      errors: validation.errors,
    });
    return { outcome: "rejected", errors: validation.errors };
  }

  const normalized = normalizeStravaActivity(activity, athleteId);
  const normalizedLaps = laps ? normalizeStravaLaps(laps) : [];
  normalized.bestPaceSecPerKm = bestPaceFromLaps(normalizedLaps);

  const supabase = getSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from("activities")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("provider", normalized.provider)
    .eq("external_id", normalized.externalId)
    .maybeSingle();

  if (lookupError) {
    return { outcome: "rejected", errors: [lookupError.message] };
  }

  const isUpdate = existing != null;

  const { data: upserted, error: upsertError } = await supabase
    .from("activities")
    .upsert(toActivityRow(normalized, "validated"), { onConflict: "athlete_id,provider,external_id" })
    .select("id")
    .single();

  if (upsertError || !upserted) {
    return { outcome: "rejected", errors: [upsertError?.message ?? "Unknown persistence error."] };
  }

  const activityId = upserted.id as string;
  const childErrors: string[] = [];

  if (normalizedLaps.length > 0) {
    const { error: lapsError } = await supabase
      .from("laps")
      .upsert(
        normalizedLaps.map((lap) => toLapRow(activityId, lap)),
        { onConflict: "activity_id,lap_number", ignoreDuplicates: true },
      );
    if (lapsError) childErrors.push(`Laps: ${lapsError.message}`);
  }

  if (streams) {
    const normalizedRecords = normalizeStravaStreams(streams, normalized.startTime);
    if (normalizedRecords.length > 0) {
      const { error: recordsError } = await supabase
        .from("records")
        .upsert(
          normalizedRecords.map((record) => toRecordRow(activityId, record)),
          { onConflict: "activity_id,sequence_index", ignoreDuplicates: true },
        );
      if (recordsError) childErrors.push(`Records: ${recordsError.message}`);
    }
  }

  const finalStatus = childErrors.length > 0 ? "failed" : "processed";
  const { error: statusError } = await supabase.from("activities").update({ status: finalStatus }).eq("id", activityId);
  if (statusError) childErrors.push(`Status update: ${statusError.message}`);

  await publishEvent(athleteId, activityId, isUpdate ? "activity_updated" : "activity_created", {
    externalId: normalized.externalId,
    status: finalStatus,
  });

  if (childErrors.length > 0) {
    // Recoverable: the activity itself is stored (status: 'failed'), so a
    // retry can re-attempt laps/records without re-fetching from Strava.
    return { outcome: "failed", activityId, errors: childErrors };
  }
  return { outcome: isUpdate ? "updated" : "created", activityId };
}

/** Archives an activity (soft delete -- see 0004's Soft Delete Policy). Never hard-deletes. */
export async function archiveActivity(athleteId: string, activityId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("activities")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", activityId);

  if (error) throw error;

  await publishEvent(athleteId, activityId, "activity_archived", {});
}
