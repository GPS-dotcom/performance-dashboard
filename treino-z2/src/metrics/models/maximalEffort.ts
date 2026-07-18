/** A single maximal (all-out) power effort of a known duration -- e.g. from a field test or a race. */
export interface MaximalEffort {
  durationSec: number;
  powerWatts: number;
}
