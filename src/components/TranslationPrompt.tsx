import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, X, Check } from 'lucide-react';

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
  ru: 'Русский',
};

export default function TranslationPrompt() {
  const { i18n } = useTranslation();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const currentLang = i18n.language.split('-')[0];
    const dismissed = localStorage.getItem('translation-prompt-dismissed');

    if (browserLang !== currentLang && languageNames[browserLang] && !dismissed) {
      setSuggestion(browserLang);
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [i18n.language]);

  const handleSwitch = () => {
    if (suggestion) {
      i18n.changeLanguage(suggestion);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('translation-prompt-dismissed', 'true');
    setIsVisible(false);
  };

  if (!suggestion) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-8 left-8 z-[200] max-w-sm w-full bg-gray-900 text-white p-6 rounded-[2rem] shadow-2xl overflow-hidden border border-white/10"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/20 rounded-full -mr-12 -mt-12 blur-2xl" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <Globe className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm">Switch to {languageNames[suggestion]}?</h4>
              </div>
              <button 
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              We've detected your system language is {languageNames[suggestion]}. Would you like to view VyntaJobs in your native tongue?
            </p>

            <div className="flex gap-3">
              <button 
                onClick={handleSwitch}
                className="flex-1 bg-white text-gray-900 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                <Check className="h-3.5 w-3.5" /> Switch
              </button>
              <button 
                onClick={handleDismiss}
                className="flex-1 bg-white/5 text-white py-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
              >
                Keep English
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
