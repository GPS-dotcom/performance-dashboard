import type { ReactNode } from "react";
import { NAV_ITEMS } from "../types";
import type { DashboardRoute } from "../types";
import { useTheme } from "../providers/themeContext";

export interface AppShellProps {
  route: DashboardRoute;
  children: ReactNode;
}

/**
 * The Dashboard's top-level layout: a persistent nav (the 8 pages this
 * task requires) plus the active page's content. Replaces App.tsx's old
 * single hardcoded <DailyBriefPage/> render. Server Components have no
 * equivalent in this Vite CSR SPA (see DASHBOARD_REPORT.md's Architecture
 * Decisions) -- this shell itself is a thin, static wrapper so the actual
 * data-fetching work stays inside each lazy-loaded page, not here.
 */
export function AppShell({ route, children }: AppShellProps) {
  const { preference, setPreference } = useTheme();

  return (
    <div className="wrap">
      <header className="top dash-top">
        <div>
          <div className="eyebrow">Treino Z2</div>
          <h1>Performance OS</h1>
        </div>
        <label className="dash-theme-toggle">
          Theme
          <select value={preference} onChange={(e) => setPreference(e.target.value as typeof preference)} aria-label="Theme preference">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </header>

      <nav className="dash-nav" aria-label="Dashboard sections">
        {NAV_ITEMS.map((item) => (
          <a key={item.route} href={item.hash} className={item.route === route ? "dash-nav-link dash-nav-link-active" : "dash-nav-link"} aria-current={item.route === route ? "page" : undefined}>
            {item.label}
          </a>
        ))}
      </nav>

      <main>{children}</main>
    </div>
  );
}
