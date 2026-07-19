import { useEffect, useState } from "react";
import type { DashboardRoute } from "../types";

/**
 * Routing decision (documented in DASHBOARD_REPORT.md): this project is a
 * Vite CSR SPA with zero router dependency and, per this session's
 * dependency-light convention (no npm package has been added across any
 * of the Metrics/Intelligence/Prediction/Coach Engine rebuilds), adding
 * react-router-dom for 8 flat routes would be disproportionate. `location.hash`
 * needs no server rewrite rules either, unlike history-API routing -- this
 * app has no server to configure.
 */
function hashToRoute(hash: string): DashboardRoute {
  switch (hash.replace(/^#\/?/, "")) {
    case "":
      return "home";
    case "activities":
      return "activities";
    case "metrics":
      return "metrics";
    case "predictions":
      return "predictions";
    case "coach":
      return "coach";
    case "shoes":
      return "shoes";
    case "laboratory":
      return "laboratory";
    case "settings":
      return "settings";
    default:
      return "home";
  }
}

export function useHashRoute(): DashboardRoute {
  const [route, setRoute] = useState<DashboardRoute>(() => hashToRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}
