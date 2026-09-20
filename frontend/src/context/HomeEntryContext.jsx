import { createContext, useContext } from "react";

export const HomeEntryContext = createContext(null);

export function useHomeEntry() {
  const ctx = useContext(HomeEntryContext);
  if (!ctx) {
    throw new Error("useHomeEntry must be used within HomeRoute");
  }
  return ctx;
}
