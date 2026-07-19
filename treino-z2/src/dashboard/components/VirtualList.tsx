import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  /** Visible viewport height in px -- the scroll container itself, not the (much taller) total list. */
  viewportHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string | number;
  overscan?: number;
  ariaLabel: string;
}

/**
 * "Virtualização para listas grandes" (both this task and the upcoming
 * History module require it), hand-rolled since no windowing library
 * (react-window etc.) is installed and this session has added zero new
 * npm dependencies across every prior engine rebuild. Fixed-height rows
 * only -- every consumer today (Activities) has a uniform row height,
 * which keeps the offset math a single multiplication instead of a
 * measured-heights cache.
 */
export function VirtualList<T>({ items, itemHeight, viewportHeight, renderItem, getKey, overscan = 4, ariaLabel }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const firstVisible = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const lastVisible = Math.min(items.length, firstVisible + visibleCount);

  const visibleItems = useMemo(() => items.slice(firstVisible, lastVisible), [items, firstVisible, lastVisible]);

  return (
    <div
      ref={containerRef}
      className="dash-virtual-list"
      style={{ height: viewportHeight, overflowY: "auto", position: "relative" }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      role="list"
      aria-label={ariaLabel}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, i) => {
          const index = firstVisible + i;
          return (
            <div key={getKey(item, index)} role="listitem" style={{ position: "absolute", top: index * itemHeight, left: 0, right: 0, height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
