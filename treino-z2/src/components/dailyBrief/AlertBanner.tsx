import type { CoachAlert } from "../../engines/coach";

/**
 * Critical/warning alerts, shown above every Daily Brief section. Per
 * COACH_ENGINE.md's Escalation Rules, "Alerts have higher priority than
 * recommendations" -- not one of the 8 ordered Daily Brief sections
 * itself, but surfaced ahead of all of them whenever one is active.
 */
export function AlertBanner({ alerts }: { alerts: CoachAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="alert-banner">
      {alerts.map((alert) => (
        <div key={alert.kind} className={`alert alert-${alert.severity}`}>
          <strong>{alert.message}</strong>
          {alert.evidence.length > 0 && <span className="alert-evidence">{alert.evidence.join(" · ")}</span>}
        </div>
      ))}
    </div>
  );
}
