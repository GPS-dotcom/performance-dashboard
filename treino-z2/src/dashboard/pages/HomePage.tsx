import { DailyBriefPage } from "../../components/dailyBrief/DailyBriefPage";

/**
 * Home page (Daily Brief) -- per this task's explicit requirement list
 * ("resumo do dia, readiness, recovery, treino recomendado, alertas,
 * recomendações, metas, próximos eventos"), all 8 already exist in the
 * Daily Brief built during an earlier phase. Reused unchanged rather than
 * rebuilt: the Dashboard's job is to present Engine output, and the Daily
 * Brief already does exactly that for Home, section by section, with its
 * own tests already at the coverage bar.
 */
export function HomePage() {
  return <DailyBriefPage />;
}
