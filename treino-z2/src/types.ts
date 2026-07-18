// Domain types for the Treino Z2 MVP. Named per the Performance.MD spec's
// "Core Entities" section, but only the fields the metrics engine and
// dashboard actually use are modeled here.

export interface Activity {
  id: string | number;
  name: string;
  startDate: string; // ISO date
  distanceM: number | null;
  movingTimeS: number | null;
  averageHeartrate: number | null;
  averageWatts: number | null;
  weightedAverageWatts: number | null;
  rtss: number | null;
  bestEfforts: Record<string, number> | null; // key -> seconds, e.g. "5k", "10k"
  zoneMinutes: ZoneMinutes | null;
}

export interface ZoneMinutes {
  Z1: number;
  Z2: number;
  Z3: number;
  Z4: number;
  Z5: number;
}

export interface MetricsSnapshot {
  date: string; // ISO date
  ctl: number; // Fitness
  atl: number; // Fatigue
  tsb: number; // Form
}

export type ZoneKey = "Z1" | "Z2" | "Z3" | "Z4" | "Z5";

export interface ZoneDefinition {
  zone: ZoneKey;
  label: string;
  hrMax: number;
  powerMax: number;
  color: string;
}
