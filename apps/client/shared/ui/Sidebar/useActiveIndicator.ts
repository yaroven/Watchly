import { useLayoutEffect, useState, type RefObject } from "react";

interface Indicator {
  top: number;
  opacity: number;
}

export function useActiveIndicator(
  activeIndex: number,
  listRef: RefObject<HTMLUListElement | null>,
  itemRefs: RefObject<(HTMLAnchorElement | null)[]>,
  indicatorHeight: number,
) {
  const [indicator, setIndicator] = useState<Indicator>({ top: 0, opacity: 0 });

  useLayoutEffect(() => {
    const container = listRef.current;
    const activeItem = itemRefs.current[activeIndex];
    if (!container || !activeItem) {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const offsetFromContainerTop = activeItem.getBoundingClientRect().top - container.getBoundingClientRect().top;
    const verticalCenteringOffset = (activeItem.offsetHeight - indicatorHeight) / 2;
    setIndicator({ top: offsetFromContainerTop + verticalCenteringOffset, opacity: 1 });
  }, [activeIndex, listRef, itemRefs, indicatorHeight]);

  return indicator;
}
