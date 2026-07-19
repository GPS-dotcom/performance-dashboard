/**
 * The Plugin Platform's own compatibility version -- what a plugin's
 * `manifest.minHostVersion`/`maxHostVersion` is checked against. Kept
 * separate from `package.json`'s `version` (still `0.0.0`, pre-release
 * for the whole app) because plugin compatibility is a contract about
 * this platform layer specifically (SDK types, extension contracts,
 * event map), not about the app's own release number -- the two can
 * change independently.
 */
export const HOST_VERSION = "1.0.0";
