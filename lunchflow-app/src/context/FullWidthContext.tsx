import { createContext, useContext, type ReactNode } from 'react';

const FullWidthContext = createContext(false);

export function FullWidthProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  return <FullWidthContext.Provider value={enabled}>{children}</FullWidthContext.Provider>;
}

export function useFullWidthLayout(): boolean {
  return useContext(FullWidthContext);
}
