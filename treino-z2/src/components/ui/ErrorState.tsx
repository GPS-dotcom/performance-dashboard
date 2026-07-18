export interface ErrorStateProps {
  title: string;
  message: string;
  possibleCause?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * DESIGN_SYSTEM.md's Error State: "Every error must provide: Clear
 * Message, Possible Cause, Recovery Action, Retry Option." role="alert"
 * so screen readers announce it immediately when it appears.
 */
export function ErrorState({ title, message, possibleCause, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div className="ui-error-state" role="alert">
      <p className="ui-error-state-title">{title}</p>
      <p className="ui-error-state-message">{message}</p>
      {possibleCause && <p className="ui-error-state-message">{possibleCause}</p>}
      {onRetry && (
        <button type="button" className="ui-retry-button" onClick={onRetry} disabled={retrying}>
          {retrying ? "Retrying…" : "Retry"}
        </button>
      )}
    </div>
  );
}
