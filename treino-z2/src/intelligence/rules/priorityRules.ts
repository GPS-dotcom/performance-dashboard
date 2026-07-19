import type { InsightCategory, InsightPriority, InsightSeverity } from "../types/insight";

// 19_INSIGHTS_LIBRARY.md, "Insight Prioritization": "1. Critical Alerts,
// 2. Injury Risk, 3. Recovery, 4. Race Readiness, 5. Performance, 6.
// Fitness, 7. Efficiency, 8. Equipment." "Critical Alerts" is a severity,
// not a category -- any insight with severity "critical" outranks every
// category-based tier, matching "Lower-priority insights should never
// hide higher-priority ones."
//
// Three categories this engine also produces (training_load, consistency,
// physiology) aren't named in that 8-slot list. Each is placed alongside
// the closest listed category it shares urgency/subject matter with:
// training_load next to recovery (both describe current physiological
// state), consistency next to fitness (consistency is what drives
// fitness trajectory), physiology next to efficiency (both are
// mechanism-level, not headline, signals).
const CATEGORY_PRIORITY: Record<InsightCategory, InsightPriority> = {
  injury_risk: 2,
  recovery: 3,
  training_load: 3,
  race_readiness: 4,
  performance: 5,
  fitness: 6,
  consistency: 6,
  efficiency: 7,
  physiology: 7,
  equipment: 8,
};

export function priorityFor(category: InsightCategory, severity: InsightSeverity): InsightPriority {
  if (severity === "critical") return 1;
  return CATEGORY_PRIORITY[category];
}
