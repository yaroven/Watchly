import React, { createContext, useCallback, useEffect, useMemo, useRef } from "react";
import { Modifier, Shortcut, ShortcutHandler, ShortcutRegistry, ShortcutsContextType } from "./types";

export const ShortcutsContext = createContext<ShortcutsContextType>({
  register: () => {},
  unregister: () => {},
});

const normalizeShortcut = (shortcut: Shortcut): string => {
  const mods = shortcut.modifiers?.slice().sort() || []; // Sort alphabetically
  const key = shortcut.key.toUpperCase(); // Normalize case
  return [...mods, key].join("+");
};

const ShortcutProvider = ({ children }: { children: React.ReactNode }) => {
  // Registry for shortcut with key as shortcut combination and value as the handler
  const ShortcutRegisteryRef = useRef<ShortcutRegistry>(new Map());

  const register = useCallback((shortcut: Shortcut, handler: ShortcutHandler, override = false) => {
    const ShortcutRegistery = ShortcutRegisteryRef.current;
    const normalizedKey = normalizeShortcut(shortcut);

    // here checking for conflicts
    if (ShortcutRegistery.has(normalizedKey) && !override) {
      console.warn(`Conflict: "${normalizedKey}" is already registered for shortcut. Use override=true to replace or handle conflict.`);
      return;
    }

    ShortcutRegistery.set(normalizedKey, handler);
  }, []);

  const unregister = useCallback((shortcut: Shortcut) => {
    ShortcutRegisteryRef.current.delete(normalizeShortcut(shortcut));
  }, []);

  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    // this check is important as without this we wont be able to write in these inputs
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }

    const modifiers: Modifier[] = [];

    if (event.ctrlKey) modifiers.push("Ctrl");
    if (event.altKey) modifiers.push("Alt");
    if (event.shiftKey) modifiers.push("Shift");
    if (event.metaKey) modifiers.push("Meta");

    const key = event.code === "Space" ? "SPACE" : event.key.toUpperCase();
    const normalizedKey = [...modifiers.sort(), key].join("+");

    const handler = ShortcutRegisteryRef.current.get(normalizedKey);
    if (handler) {
      event.preventDefault();
      handler(event);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo(() => ({ register, unregister }), [register, unregister]);

  return <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>;
};

export default ShortcutProvider;
