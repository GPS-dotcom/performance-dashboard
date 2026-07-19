import { getSupabase } from "../../api/supabaseClient";

export interface AthleteProfile {
  id: string;
  birthday: string | null;
  sex: "male" | "female" | "other" | null;
  heightCm: number | null;
  weightKg: number | null;
  ftp: number | null;
  vo2max: number | null;
  maxHr: number | null;
  restingHr: number | null;
  thresholdPaceSecPerKm: number | null;
  thresholdPower: number | null;
  preferredUnits: "metric" | "imperial";
}

interface AthleteRow {
  id: string;
  birthday: string | null;
  sex: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  ftp: number | null;
  vo2max: number | null;
  max_hr: number | null;
  resting_hr: number | null;
  threshold_pace_sec_per_km: number | null;
  threshold_power: number | null;
  preferred_units: "metric" | "imperial";
}

function mapAthleteRow(row: AthleteRow): AthleteProfile {
  return {
    id: row.id,
    birthday: row.birthday,
    sex: row.sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    ftp: row.ftp,
    vo2max: row.vo2max,
    maxHr: row.max_hr,
    restingHr: row.resting_hr,
    thresholdPaceSecPerKm: row.threshold_pace_sec_per_km,
    thresholdPower: row.threshold_power,
    preferredUnits: row.preferred_units,
  };
}

/**
 * Reads the athlete profile row (`athletes`, migration 0001). This app has
 * no sign-in flow yet (PROJECT_AUDIT.md) -- every screen implicitly serves
 * a single athlete -- so this fetches the first row rather than filtering
 * by a session user id. Same defensive shape as goalService.fetchUpcomingGoal:
 * a missing table/row is "no profile yet," never a hard error, since most
 * of the Dashboard must keep working without one.
 */
export async function fetchCurrentAthlete(): Promise<AthleteProfile | null> {
  try {
    const { data, error } = await getSupabase()
      .from("athletes")
      .select("id,birthday,sex,height_cm,weight_kg,ftp,vo2max,max_hr,resting_hr,threshold_pace_sec_per_km,threshold_power,preferred_units")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[athleteProfileService] could not fetch athlete profile:", error.message);
      return null;
    }
    if (!data) return null;
    return mapAthleteRow(data as AthleteRow);
  } catch (err) {
    console.warn("[athleteProfileService] unexpected error fetching athlete profile:", err);
    return null;
  }
}
