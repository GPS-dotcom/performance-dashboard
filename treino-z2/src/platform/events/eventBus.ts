export type EventHandler<TPayload> = (payload: TPayload) => void;

/** Returned by every subscribe call -- call it to stop listening. Never throws, even if called twice. */
export type Unsubscribe = () => void;

/**
 * A typed publish/subscribe bus, generic over any event map shape
 * `{ [eventName]: payloadType }`. `platformEventBus` (below) is the one
 * instance the app and plugins actually use, typed over
 * `PlatformEventMap` -- the class itself stays independent of that map so
 * it's fully unit-testable with a synthetic map and so a plugin wanting
 * its own private bus (rare, but the SDK doesn't forbid it) can construct
 * one.
 *
 * Deliberately synchronous and in-process: FASE 2 asks for "comunicação
 * entre módulos" within one running app, not a distributed message queue
 * -- see PLUGIN_PLATFORM_REPORT.md's Limitations for why a real queue
 * (e.g. for background workers) is future work, not this bus's job.
 */
export class EventBus<TEventMap extends object> {
  private readonly handlers = new Map<keyof TEventMap, Set<EventHandler<unknown>>>();

  /** Notifies every current subscriber of `type`, in subscription order. A handler that throws is caught and logged -- it never stops the remaining handlers from running. */
  publish<K extends keyof TEventMap>(type: K, payload: TEventMap[K]): void {
    const set = this.handlers.get(type);
    if (!set || set.size === 0) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] subscriber for "${String(type)}" threw:`, err);
      }
    }
  }

  /** Registers `handler` for every future `publish(type, ...)` call. Returns an Unsubscribe. */
  subscribe<K extends keyof TEventMap>(type: K, handler: EventHandler<TEventMap[K]>): Unsubscribe {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as EventHandler<unknown>);
    return () => {
      set!.delete(handler as EventHandler<unknown>);
    };
  }

  /** Like subscribe, but auto-unsubscribes after the first matching event. */
  once<K extends keyof TEventMap>(type: K, handler: EventHandler<TEventMap[K]>): Unsubscribe {
    const unsubscribe = this.subscribe(type, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  /** Removes every subscriber of `type` (or every subscriber of every type, if `type` is omitted). Mainly for plugin teardown -- see manager/pluginManager.ts's disable/uninstall. */
  clear<K extends keyof TEventMap>(type?: K): void {
    if (type === undefined) {
      this.handlers.clear();
    } else {
      this.handlers.delete(type);
    }
  }

  /** Number of active subscribers for `type` -- mainly for tests and diagnostics. */
  listenerCount<K extends keyof TEventMap>(type: K): number {
    return this.handlers.get(type)?.size ?? 0;
  }
}
