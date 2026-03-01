import { createContext, useContext, type ReactNode } from "react";

const ScrollContainerContext = createContext<HTMLElement | null>(null);

interface ScrollContainerProviderProps {
  readonly value: HTMLElement | null;
  readonly children: ReactNode;
}

export function ScrollContainerProvider({
  value,
  children,
}: ScrollContainerProviderProps): ReactNode {
  return (
    <ScrollContainerContext.Provider value={value}>{children}</ScrollContainerContext.Provider>
  );
}

export function useScrollContainer(): HTMLElement | null {
  return useContext(ScrollContainerContext);
}
