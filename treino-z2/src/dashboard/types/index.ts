export type DashboardRoute = "home" | "activities" | "metrics" | "predictions" | "coach" | "shoes" | "laboratory" | "settings";

export interface NavItem {
  route: DashboardRoute;
  label: string;
  hash: string;
}

/** The 8 pages this task requires, in the order they appear in the nav -- Home first (the Daily Brief). */
export const NAV_ITEMS: NavItem[] = [
  { route: "home", label: "Home", hash: "#/" },
  { route: "activities", label: "Activities", hash: "#/activities" },
  { route: "metrics", label: "Metrics", hash: "#/metrics" },
  { route: "predictions", label: "Predictions", hash: "#/predictions" },
  { route: "coach", label: "Coach", hash: "#/coach" },
  { route: "shoes", label: "Shoes", hash: "#/shoes" },
  { route: "laboratory", label: "Laboratory", hash: "#/laboratory" },
  { route: "settings", label: "Settings", hash: "#/settings" },
];

export type LoadState<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };
