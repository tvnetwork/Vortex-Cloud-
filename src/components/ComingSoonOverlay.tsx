import React from 'react';
import { motion } from 'motion/react';
import { Construction, Lock } from 'lucide-react';

import { useTranslation } from 'react-i18next';

interface ComingSoonOverlayProps {
  title?: string;
  description?: string;
}

export default function ComingSoonOverlay({ 
  title, 
  description 
}: ComingSoonOverlayProps) {
  const { t } = useTranslation();
  const displayTitle = title || t('common.comingSoon');
  const displayDescription = description || t('common.comingSoonDesc');

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 text-center">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-md bg-white p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col items-center"
      >
        <div className="h-20 w-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mb-8 border border-indigo-100">
          <Construction className="h-10 w-10 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
          <Lock className="h-3 w-3" /> {t('common.underConstruction')}
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">{displayTitle}</h2>
        <p className="text-gray-500 font-medium leading-relaxed mb-10">
          {displayDescription}
        </p>
        <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden p-0.5">
           <motion.div 
             initial={{ width: "30%" }}
             animate={{ width: "85%" }}
             transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
             className="h-full bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)]"
           />
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6">{t('common.securePortal')} v1.2</p>
      </motion.div>
    </div>
  );
}
