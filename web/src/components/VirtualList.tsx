import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../lib/utils";

const vhPx = (): number => window.innerHeight / 100;

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  /** Estimated row height in vh; rows measure themselves after mount. */
  estimateSize: number;
  /** Row gap in vh. */
  gap?: number;
  getItemKey: (item: T, index: number) => string | number;
  empty?: ReactNode;
  className?: string;
}

/** Every scrolling list of data (tgiann-ui rule): only visible rows render, positions on whole pixels. */
export function VirtualList<T>({ items, renderItem, estimateSize, gap = 0, getItemKey, empty, className }: VirtualListProps<T>) {
  "use no memo";
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize * vhPx(),
    gap: gap * vhPx(),
    overscan: 4,
    // Measures in the next frame: re-layout inside the observer callback floods ResizeObserver warnings.
    useAnimationFrameWithResizeObserver: true,
    getItemKey: (index) => {
      const item = items[index];
      return item === undefined ? index : getItemKey(item, index);
    },
  });

  return (
    <div ref={scrollRef} className={cn("overflow-y-auto", className)}>
      {items.length === 0 ? (
        empty
      ) : (
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((row) => {
            const item = items[row.index];
            return item === undefined ? null : (
              <div
                key={row.key}
                data-index={row.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${Math.round(row.start)}px)` }}
              >
                {renderItem(item, row.index)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
