import { Suspense, lazy } from "react";
import { AppShell } from "./dashboard/layouts/AppShell";
import { ThemeProvider } from "./dashboard/providers/ThemeProvider";
import { useHashRoute } from "./dashboard/hooks/useHashRoute";
import { LoadingState } from "./components/ui/LoadingState";
import type { DashboardRoute } from "./dashboard/types";

// Per-page code splitting: this project is a Vite CSR SPA with no
// server-rendering framework, so React Server Components (as asked for
// by this task) have no literal equivalent here -- see
// DASHBOARD_REPORT.md's Architecture Decisions. React.lazy + Suspense is
// the closest practical substitute available in this stack, and serves
// the same underlying goal RSC serves in Next.js: each page's code only
// ships to the browser once that page is actually visited, instead of
// bloating a single entry bundle.
const HomePage = lazy(() => import("./dashboard/pages/HomePage").then((m) => ({ default: m.HomePage })));
const ActivitiesPage = lazy(() => import("./dashboard/pages/ActivitiesPage").then((m) => ({ default: m.ActivitiesPage })));
const MetricsPage = lazy(() => import("./dashboard/pages/MetricsPage").then((m) => ({ default: m.MetricsPage })));
const PredictionsPage = lazy(() => import("./dashboard/pages/PredictionsPage").then((m) => ({ default: m.PredictionsPage })));
const CoachPage = lazy(() => import("./dashboard/pages/CoachPage").then((m) => ({ default: m.CoachPage })));
const ShoesPage = lazy(() => import("./dashboard/pages/ShoesPage").then((m) => ({ default: m.ShoesPage })));
const LaboratoryPage = lazy(() => import("./dashboard/pages/LaboratoryPage").then((m) => ({ default: m.LaboratoryPage })));
const SettingsPage = lazy(() => import("./dashboard/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

const PAGES: Record<DashboardRoute, React.ComponentType> = {
  home: HomePage,
  activities: ActivitiesPage,
  metrics: MetricsPage,
  predictions: PredictionsPage,
  coach: CoachPage,
  shoes: ShoesPage,
  laboratory: LaboratoryPage,
  settings: SettingsPage,
};

function App() {
  const route = useHashRoute();
  const Page = PAGES[route];

  return (
    <ThemeProvider>
      <AppShell route={route}>
        <Suspense fallback={<LoadingState message="Loading…" />}>
          <Page />
        </Suspense>
      </AppShell>
    </ThemeProvider>
  );
}

export default App;
