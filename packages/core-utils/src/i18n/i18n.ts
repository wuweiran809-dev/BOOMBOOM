export const LOCALE_FILES = [ 'player', 'server' ]

export const I18N_LOCALES = {
  'en-US': 'English',
  'zh-Hans-CN': '简体中文'
}

const I18N_LOCALE_ALIAS = {
  'en': 'en-US',
  'zh': 'zh-Hans-CN',
  'zh-CN': 'zh-Hans-CN',
  'zh-Hans': 'zh-Hans-CN'
}

export const AVAILABLE_LOCALES = Object.keys(I18N_LOCALES).concat(Object.keys(I18N_LOCALE_ALIAS))

export function getDefaultLocale () {
  return 'en-US'
}

export function isDefaultLocale (locale: string) {
  return getCompleteLocale(locale) === getCompleteLocale(getDefaultLocale())
}

export function boomboomTranslate (str: string, translations?: { [id: string]: string }) {
  if (!translations?.[str]) return str

  return translations[str]
}

const possiblePaths = AVAILABLE_LOCALES.map(l => '/' + l)
export function is18nPath (path: string) {
  return possiblePaths.includes(path)
}

export function is18nLocale (locale: string) {
  return AVAILABLE_LOCALES.includes(locale)
}

export function getCompleteLocale (locale: string) {
  if (!locale) return locale

  const found = (I18N_LOCALE_ALIAS as any)[locale] as string

  return found || locale
}

export function getShortLocale (locale: string) {
  if (locale.includes('-') === false) return locale

  return locale.split('-')[0]
}

export function buildFileLocale (locale: string) {
  return getCompleteLocale(locale)
}
