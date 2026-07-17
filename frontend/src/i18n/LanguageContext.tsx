import { createContext, useState, useCallback, type ReactNode } from 'react'
import { translations, type Lang, type TranslationKey } from './translations'

export interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: TranslationKey) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'marine-lang'

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'vi'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'vi' || stored === 'en') return stored
  return 'vi'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang)

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem(STORAGE_KEY, newLang)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'vi' ? 'en' : 'vi')
  }, [lang, setLang])

  const t = useCallback(
    (key: TranslationKey) => {
      return translations[lang][key] ?? translations.en[key] ?? key
    },
    [lang],
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}
