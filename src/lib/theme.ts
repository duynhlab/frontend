/**
 * Light/dark theme, applied by toggling `.dark` on <html> (the class the
 * token file's `@custom-variant dark` keys on).
 *
 * Three states, not two: an explicit choice is remembered, and `system`
 * follows the OS and keeps following it while the tab is open.
 */

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return isTheme(stored) ? stored : 'system'
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setTheme(theme: Theme) {
  if (theme === 'system') localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, theme)
  apply(theme)
  window.dispatchEvent(new Event('theme-change'))
}

/** Call once at startup, before first paint. */
export function initTheme() {
  apply(getTheme())
  media.addEventListener('change', () => {
    if (getTheme() === 'system') apply('system')
  })
}

export function onThemeChange(listener: () => void): () => void {
  window.addEventListener('theme-change', listener)
  return () => window.removeEventListener('theme-change', listener)
}
