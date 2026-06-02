import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          common: {
            brandName: 'Vortex Cloud',
            tagline: 'Developer Serverless Edge & Database Core Platform.',
            getStarted: 'Deploy Now',
            login: 'Launch Console',
            logout: 'Sign Out',
            loading: 'Vortex initializing...',
            launching: 'Spinning up container pods...',
            welcome: 'Welcome to Vortex Cloud',
            dashboard: 'Dashboard',
            profile: 'Profile Settings',
            projects: 'Projects',
            community: 'Lobby Chat',
            copyright: '© 2026 Vortex Cloud Platforms Inc. All rights reserved.',
            back: 'Back to Safety'
          },
          nav: {
            console: 'Platform Console',
            community: 'Global Lobby',
            dashboard: 'Console Hub',
            billing: 'Billing & Node Quotas',
            admin: 'Root Control'
          },
          role: {
            selectTitle: 'Choose Developer Account Tier',
            developer: 'Serverless Developer',
            developerDesc: 'Provision microservices, edge workers, and relational database clusters instantly.',
            client: 'Enterprise Systems Architect',
            clientDesc: 'Oversee high-scale container networks, team access controls, and custom SSL load balancers.'
          }
        }
      }
    }
  });

export default i18n;
