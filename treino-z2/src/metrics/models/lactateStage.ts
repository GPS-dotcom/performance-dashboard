export interface LactateStage {
  stageNumber: number;
  speedMps?: number | null;
  powerWatts?: number | null;
  heartRate?: number | null;
  bloodLactateMmol: number;
}

export interface LactateThreshold {
  intensity: number;
  intensityUnit: "speed_mps" | "power_watts";
  heartRate: number | null;
}
