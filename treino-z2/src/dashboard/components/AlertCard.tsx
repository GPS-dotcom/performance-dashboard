import type { Alert } from "../../coach";

/** COMPONENT_LIBRARY.md's "Alert Cards" -- one Coach Engine Alert, presented verbatim. Same severity styling as the Daily Brief's AlertBanner. */
export function AlertCard({ alert }: { alert: Alert }) {
  return (
    <div className={`alert alert-${alert.severity}`} role={alert.severity === "critical" ? "alert" : "status"}>
      <strong>{alert.title}</strong>
      <span className="alert-evidence">{alert.description}</span>
      {alert.actionRequired && <span className="alert-action">{alert.actionRequired}</span>}
    </div>
  );
}
