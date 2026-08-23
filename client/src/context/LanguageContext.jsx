import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../messages/en.json';
import hi from '../messages/hi.json';
import mr from '../messages/mr.json';
import { API_BASE } from '../services/api';

const dictionaries = { en, hi, mr };

export const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी (Hindi)', short: 'हिं', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी (Marathi)', short: 'मरा', flag: '🇮🇳' }
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children, user }) {
  const getInitialLanguage = () => {
    if (user && user.preferredLanguage && dictionaries[user.preferredLanguage]) {
      return user.preferredLanguage;
    }
    const saved = localStorage.getItem('app_language');
    if (saved && dictionaries[saved]) {
      return saved;
    }
    return 'en';
  };

  const [language, setLanguageState] = useState(getInitialLanguage);

  // Sync when logged-in user changes or loads
  useEffect(() => {
    if (user && user.preferredLanguage && dictionaries[user.preferredLanguage]) {
      setLanguageState(user.preferredLanguage);
      localStorage.setItem('app_language', user.preferredLanguage);
    }
  }, [user]);

  const changeLanguage = async (newLang) => {
    if (!dictionaries[newLang]) return;

    setLanguageState(newLang);
    localStorage.setItem('app_language', newLang);

    // Persist to user DB record if logged in
    if (user && user.id) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/auth/language`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify({ preferredLanguage: newLang })
        });
      } catch (err) {
        console.error('Failed to persist language preference:', err);
      }
    }
  };

  // Nested object lookup utility
  const t = (path, params = {}) => {
    const keys = path.split('.');
    let current = dictionaries[language] || dictionaries.en;

    for (const k of keys) {
      if (current && current[k] !== undefined) {
        current = current[k];
      } else {
        // Fallback to English dictionary
        let fallback = dictionaries.en;
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            return path; // Return raw key path if missing completely
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current === 'string') {
      let result = current;
      Object.keys(params).forEach(p => {
        result = result.replace(new RegExp(`{${p}}`, 'g'), params[p]);
      });
      return result;
    }

    return path;
  };

  // Locale aware formatters
  const formatCurrency = (amount = 0) => {
    const num = Number(amount) || 0;
    return `₹${num.toFixed(2)}`;
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    const localeMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
    return d.toLocaleDateString(localeMap[language] || 'en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusLabel = (statusKey) => {
    if (!statusKey) return '';
    const translated = t(`status.${statusKey}`);
    return (translated && translated !== `status.${statusKey}`) ? translated : statusKey;
  };

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      t,
      getStatusLabel,
      formatCurrency,
      formatDate,
      availableLanguages: AVAILABLE_LANGUAGES
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      changeLanguage: () => {},
      t: (path) => path,
      getStatusLabel: (status) => status || '',
      formatCurrency: (val) => `₹${(Number(val) || 0).toFixed(2)}`,
      formatDate: (val) => val || '',
      availableLanguages: AVAILABLE_LANGUAGES
    };
  }
  return context;
}
