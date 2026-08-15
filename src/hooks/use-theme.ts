import { useSyncExternalStore } from 'react'
import { getTheme, onThemeChange, setTheme, type Theme } from '@/lib/theme'

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(onThemeChange, getTheme)
  return [theme, setTheme]
}
