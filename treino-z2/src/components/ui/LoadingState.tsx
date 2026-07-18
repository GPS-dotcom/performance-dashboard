/** DESIGN_SYSTEM.md's Loading State. A text placeholder today -- skeleton components are a documented future improvement (see docs/ARCHITECTURE.md). */
export function LoadingState({ message }: { message: string }) {
  return (
    <p className="ui-loading-state" role="status" aria-live="polite">
      {message}
    </p>
  );
}
