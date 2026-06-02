import React from 'react';
import { Link } from 'react-router-dom';
import { Orbit } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-white py-20 px-4 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1 space-y-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Orbit className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">{t('common.brandName')}</span>
          </div>
          <p className="text-gray-400">{t('common.tagline')}</p>
        </div>
        <div>
          <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-500">{t('nav.marketplace')}</h4>
          <ul className="space-y-4 text-gray-400">
            <li>
              <Link to="/jobs" className="hover:text-white transition-all flex items-center gap-2 group w-fit">
                {t('nav.findWork')}
                <span className="text-indigo-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  →
                </span>
              </Link>
            </li>
            <li>
              <Link to="/post-job" className="hover:text-white transition-all flex items-center gap-2 group w-fit">
                {t('nav.postProject')}
                <span className="text-indigo-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  →
                </span>
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-all flex items-center gap-2 group w-fit">
                {t('common.enterprise')}
                <span className="text-indigo-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  →
                </span>
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6">{t('common.about')}</h4>
          <ul className="space-y-4 text-gray-400">
            <li><Link to="/about" className="hover:text-white transition-colors">{t('common.about')}</Link></li>
            <li><Link to="/trust-safety" className="hover:text-white transition-colors">{t('common.trust')}</Link></li>
            <li><Link to="/careers" className="hover:text-white transition-colors">{t('common.careers')}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6">{t('common.support')}</h4>
          <ul className="space-y-4 text-gray-400">
            <li><Link to="/help-center" className="hover:text-white transition-colors">{t('common.help')}</Link></li>
            <li><Link to="/community" className="hover:text-white transition-colors">{t('common.community')}</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">{t('common.contact')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-gray-800 text-gray-500 text-sm flex flex-col md:flex-row justify-between gap-6">
        <p>{t('common.copyright')}</p>
        <div className="flex gap-6">
          <Link to="/privacy" className="hover:text-white transition-colors">{t('common.privacy')}</Link>
          <Link to="/terms" className="hover:text-white transition-colors">{t('common.terms')}</Link>
        </div>
      </div>
    </footer>
  );
}
