'use client';

import { AnalysisProvider } from '@/context/AnalysisContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AnalysisProvider>{children}</AnalysisProvider>;
}
