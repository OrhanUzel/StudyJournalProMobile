import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '../i18n/translations';

const LanguageContext = createContext({ language: 'tr', setLanguage: () => {}, t: (key, params) => key });

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('tr');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('languagePreference');
        if (stored && (stored === 'tr' || stored === 'en')) {
          setLanguage(stored);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('languagePreference', language);
      } catch {}
    })();
  }, [language]);

  const interpolate = (str, params) => {
    if (!params || typeof params !== 'object') return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : ''));
  };

  const t = (key, params) => {
    const dict = translations[language] || {};
    let str = dict[key];
    if (str == null) {
      // Fallback to English, then Turkish, then key
      str = (translations.en && translations.en[key]) || (translations.tr && translations.tr[key]) || key;
    }
    return interpolate(String(str), params);
  };

  const value = { language, setLanguage, t };
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;