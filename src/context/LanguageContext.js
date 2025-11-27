import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '../i18n/translations';
import { getDefaultLanguage } from '../services/RegionService';

const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, t: (key, params) => key });

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('languagePreference');
        if (stored && ['tr','en','ar','es'].includes(stored)) {
          setLanguage(stored);
        } else {
          const def = getDefaultLanguage();
          setLanguage(def);
        }
      } catch {
        const def = getDefaultLanguage();
        setLanguage(def);
      }
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