import { useId } from "react";

export function useTabA11y<T extends string>() {
  const base = useId();
  return {
    tab: (value: T) => ({ id: `${base}-tab-${value}`, "aria-controls": `${base}-panel-${value}` }),
    panel: (value: T) => ({ id: `${base}-panel-${value}`, role: "tabpanel", "aria-labelledby": `${base}-tab-${value}` }),
  };
}
