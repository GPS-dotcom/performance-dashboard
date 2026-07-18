/** One per-second (or similar-resolution) sample from an activity's sensor stream. */
export interface ActivityRecordPoint {
  recordedAt: string; // ISO datetime
  speedMps: number | null;
  heartRate: number | null;
  powerWatts?: number | null;
}
