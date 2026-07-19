import type { Alert } from "../../coach";

/**
 * Critical/warning/info alerts, shown above every Daily Brief section.
 * Per 10_COACH_ENGINE.md's Escalation Rules, "Alerts have higher priority
 * than recommendations" -- not one of the 8 ordered Daily Brief sections
 * itself, but surfaced ahead of all of them whenever one is active.
 */
export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="alert-banner">
      {alerts.map((alert) => (
        <div key={alert.id} className={`alert alert-${alert.severity}`} role={alert.severity === "critical" ? "alert" : "status"}>
          <strong>{alert.title}</strong>
          <span className="alert-evidence">{alert.description}</span>
          {alert.actionRequired && <span className="alert-action">{alert.actionRequired}</span>}
        </div>
      ))}
    </div>
  );
}
