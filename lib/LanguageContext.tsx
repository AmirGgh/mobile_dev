import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LanguageContextType = {
  language: 'he' | 'en';
  setLanguage: (lang: 'he' | 'en') => void;
  t: (key: string, en?: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<'he' | 'en', string>> = {
  profileTitle: { he: 'הפרופיל שלי', en: 'My Profile' },
  totalXp: { he: 'XP סה"כ', en: 'Total XP' },
  rank: { he: 'דרגה', en: 'Rank' },
  logout: { he: 'התנתק', en: 'Logout' },
  englishMode: { he: 'שפה אנגלית', en: 'English Mode' },
  newUser: { he: 'מתאמן חדש', en: 'New User' },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'he' | 'en'>('he');

  useEffect(() => {
    // Load saved language on mount
    AsyncStorage.getItem('app_language').then((saved) => {
      if (saved === 'en' || saved === 'he') {
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = async (lang: 'he' | 'en') => {
    setLanguageState(lang);
    await AsyncStorage.setItem('app_language', lang);
  };

  const t = (key: string, en?: string): string => {
    if (language === 'en' && en) return en;
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
