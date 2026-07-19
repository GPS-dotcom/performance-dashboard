import type { ActivityEventType } from "./types";

// In-process pub/sub for same-session subscribers (e.g. a future
// Intelligence Engine listener running in the same browser tab). This is
// a complement to, not a replacement for, the durable `activity_events`
// table written by activityEngine.ts -- that table is the source of truth
// for "Events... trigger downstream engines" and for traceability across
// sessions/devices; this bus only reaches listeners registered right now,
// in this JS runtime.

export interface ActivityEvent {
  athleteId: string;
  activityId: string | null;
  eventType: ActivityEventType;
  data?: Record<string, unknown>;
}

type ActivityEventHandler = (event: ActivityEvent) => void;

const handlers = new Map<ActivityEventType, Set<ActivityEventHandler>>();

/** Subscribes to an Activity Engine event. Returns an unsubscribe function. */
export function onActivityEvent(eventType: ActivityEventType, handler: ActivityEventHandler): () => void {
  if (!handlers.has(eventType)) handlers.set(eventType, new Set());
  handlers.get(eventType)!.add(handler);
  return () => {
    handlers.get(eventType)?.delete(handler);
  };
}

export function emitActivityEvent(event: ActivityEvent): void {
  handlers.get(event.eventType)?.forEach((handler) => handler(event));
}

/** Test-only: resets all subscriptions between test cases. */
export function clearActivityEventHandlers(): void {
  handlers.clear();
}
