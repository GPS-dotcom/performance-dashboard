export interface EmptyStateProps {
  message: string;
  action?: string;
}

/** DESIGN_SYSTEM.md's Empty State: "Include: Explanation, Suggested Action." (Illustration omitted -- no decorative imagery exists in this app yet.) */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <p className="ui-empty-state">
      {message}
      {action && <span className="ui-empty-state-action">{action}</span>}
    </p>
  );
}
