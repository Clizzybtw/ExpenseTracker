import { useMemo } from 'react';
import { useTheme } from './useTheme.jsx';

const NAMES = ['accent', 'ok', 'warning', 'danger', 'text', 'text-muted', 'text-faint', 'line', 'surface', 'raised'];

/**
 * WHY: Recharts needs concrete colour strings — passing `var(--accent)` as a
 * fill renders nothing. The `theme` dependency is load-bearing: without it the
 * values are captured once and charts keep the old theme's colours until a full
 * reload, leaving dark axes on a white page after a toggle.
 */
export function useThemeTokens() {
  const { theme } = useTheme();

  return useMemo(() => {
    if (typeof window === 'undefined') return {};
    const s = getComputedStyle(document.documentElement);
    const out = {};
    for (const n of NAMES) {
      out[n.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = s.getPropertyValue(`--${n}`).trim();
    }
    return out;
  }, [theme]);
}
