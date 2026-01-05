import * as Localization from 'expo-localization';

export function isTurkeyRegion() {
  try {
    const getLocales = Localization.getLocales?.bind(Localization);
    const locales = typeof getLocales === 'function' ? getLocales() : [];
    const regionCodes = Array.isArray(locales)
      ? locales.map((l) => (l?.regionCode || '').toUpperCase()).filter(Boolean)
      : [];
    if (regionCodes.includes('TR')) return true;

    const region = (Localization.region || '').toUpperCase();
    if (region === 'TR') return true;

    // Fallback: locale includes Turkish
    const locale = (Localization.locale || '').toLowerCase();
    if (locale.includes('tr-tr') || locale.endsWith('-tr')) return true;

    return false;
  } catch (e) {
    console.warn('isTurkeyRegion check failed:', e);
    return false;
  }
}

export function getDefaultLanguage() {
  try {
    const getLocales = Localization.getLocales?.bind(Localization);
    const locales = typeof getLocales === 'function' ? getLocales() : [];
    
    // iOS için önce languageCode'a bak (daha güvenilir)
    if (Array.isArray(locales) && locales.length > 0) {
      const langCode = (locales[0]?.languageCode || '').toLowerCase();
      if (langCode === 'tr') return 'tr';
      if (langCode === 'ar') return 'ar';
      if (langCode === 'es') return 'es';
      if (langCode === 'en') return 'en';
    }
    
    // Sonra regionCode'a bak
    const regionCodes = Array.isArray(locales)
      ? locales.map((l) => (l?.regionCode || '').toUpperCase()).filter(Boolean)
      : [];
    const region = (Localization.region || '').toUpperCase();
    const code = (regionCodes[0] || region || '').toUpperCase();
    const arabicRegions = new Set(['PS','AE','SA','IQ','JO','LB','SY','EG','QA','BH','KW','OM','DZ','MA','TN','LY','YE']);
    const spanishRegions = new Set(['ES','MX','CO','AR','CL','PE','VE','EC','GT','CU','DO','HN','NI','CR','PA','UY','PY','BO','SV','PR']);
    if (code === 'TR') return 'tr';
    if (arabicRegions.has(code)) return 'ar';
    if (spanishRegions.has(code)) return 'es';
    
    // Son fallback: locale string
    const locale = (Localization.locale || '').toLowerCase();
    if (locale.includes('tr') || locale.startsWith('tr')) return 'tr';
    if (locale.includes('ar') || locale.startsWith('ar')) return 'ar';
    if (locale.includes('es') || locale.startsWith('es')) return 'es';
    return 'en';
  } catch (e) {
    return 'en';
  }
}