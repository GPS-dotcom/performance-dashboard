import type { DailyBriefViewModel } from "./assembleDailyBrief";

// This app has no router -- the Daily Brief is the only screen, and it
// never unmounts/remounts except on a full page reload. sessionStorage
// (survives reloads, cleared when the tab closes) lets a reload show the
// athlete's last-known brief instantly instead of a blank loading state,
// while a fresh fetch still runs in the background and replaces it.
// Versioned key so a future change to DailyBriefViewModel's shape can't
// deserialize into stale, mismatched data.
const CACHE_KEY = "treino-z2:daily-brief:v1";
const MAX_AGE_MS = 5 * 60 * 1000;

interface CacheEntry {
  savedAt: number;
  viewModel: DailyBriefViewModel;
}

/** Returns the cached view model if one exists and is fresher than MAX_AGE_MS, else null. */
export function readDailyBriefCache(): DailyBriefViewModel | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (typeof entry.savedAt !== "number" || Date.now() - entry.savedAt > MAX_AGE_MS) return null;
    return entry.viewModel;
  } catch {
    // Corrupted JSON, or sessionStorage unavailable (private browsing, quota,
    // sandboxed iframe) -- caching is an optimization, never a requirement.
    return null;
  }
}

export function writeDailyBriefCache(viewModel: DailyBriefViewModel): void {
  try {
    const entry: CacheEntry = { savedAt: Date.now(), viewModel };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Same as above -- silently skip caching rather than fail the render.
  }
}
