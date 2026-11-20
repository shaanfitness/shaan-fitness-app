import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// The website reads only the chosen language from here; the app's words live in strings.ts and load with the app.

let saved: string | null = null
try { saved = localStorage.getItem('sf.lang') } catch { saved = null }

i18n.use(initReactI18next).init({
  resources: { en: { translation: {} }, te: { translation: {} } },
  lng: saved === 'te' ? 'te' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang: 'en' | 'te') {
  i18n.changeLanguage(lang)
  document.documentElement.lang = lang
  try { localStorage.setItem('sf.lang', lang) } catch { /* private mode: keep it for this visit only */ }
}

export default i18n
