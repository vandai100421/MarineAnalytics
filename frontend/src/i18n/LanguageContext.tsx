import { createContext, useCallback, type ReactNode } from 'react'
import { translations, type TranslationKey } from './translations'

export interface I18nContextValue {
  t: (key: TranslationKey) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const t = useCallback((key: TranslationKey) => {
    return translations[key] ?? key
  }, [])

  return <I18nContext.Provider value={{ t }}>{children}</I18nContext.Provider>
}
