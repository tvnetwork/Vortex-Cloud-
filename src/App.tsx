import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import LiveSupport from './components/LiveSupport';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, loginWithGoogle } from './lib/firebase';
import { UserProfile, UserRole } from './types';
import { motion, AnimatePresence } from 'motion/react';
import PageTransition from './components/PageTransition';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import { 
  Terminal, 
  Cpu, 
  HardDrive,
  Activity, 
  LogOut,
  Sliders,
  DollarSign,
  Globe,
  User as UserIcon,
  LayoutDashboard,
  Lock,
  Plus
} from 'lucide-react';
import { cn } from './lib/utils';

// Context
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateGithub: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Layout Components
const Navbar = () => {
  const { user, profile, loading, login, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  // Update lastActive on navigation
  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      updateDoc(docRef, { lastActive: serverTimestamp() }).catch(() => {});
    }
  }, [user, location.pathname]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const navLinks = [
    { to: "/dashboard", label: 'Console', show: !!user, icon: LayoutDashboard },
    { to: "/community", label: 'Dev Lobby', show: true, icon: Globe },
    { to: "/wallet", label: 'Billing', show: !!user, icon: DollarSign },
    { to: "/admin", label: 'Root Control', show: profile?.role === 'admin' || user?.email === 'oladoyeheritage445@gmail.com', icon: Lock },
  ];

  return (
    <nav className="border-b border-slate-800 bg-[#070b14]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <motion.div 
                whileHover={{ rotate: 180, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="p-1.5 md:p-2 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-lg md:rounded-xl shadow-lg shadow-indigo-500/20"
              >
                <Terminal className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-md md:text-lg font-bold tracking-tight text-white leading-tight">Vortex Cloud</span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Console v1.6</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.filter(link => link.show).map(link => (
              <Link 
                key={link.to}
                to={link.to} 
                className="relative px-4 py-2 group"
              >
                <span className={`text-sm font-bold transition-colors duration-200 ${
                  location.pathname === link.to ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-100'
                }`}>
                  {link.label}
                </span>
                {location.pathname === link.to && (
                  <motion.div 
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                <Link to="/profile" className="flex items-center gap-2 group">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="h-9 w-9 rounded-full bg-slate-700 overflow-hidden border border-slate-600 group-hover:border-cyan-400 transition-colors ring-2 ring-transparent group-hover:ring-cyan-400/20 shadow-sm"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="h-full w-full p-2 text-white bg-slate-800" />
                    )}
                  </motion.div>
                </Link>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={logout} 
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors hidden sm:block"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </motion.button>
              </div>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogin}
                className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50"
                disabled={loading}
              >
                Access Console
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Anchored Bottom Navigation Component
const BottomNavigation = () => {
  const { user } = useAuth();
  const location = useLocation();

  const bottomLinks = [
    { to: "/", icon: Terminal, label: 'Home' },
    ...(user ? [
      { to: "/dashboard", icon: LayoutDashboard, label: 'Console' },
      { to: "/wallet", icon: DollarSign, label: 'Billing' },
    ] : []),
    { to: "/community", icon: Globe, label: 'Lobby' },
    { to: user ? "/profile" : "/dashboard", icon: user ? UserIcon : LogOut, label: user ? 'Profile' : 'Get Started' }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 pointer-events-auto">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-[#070b14]/95 backdrop-blur-2xl border-t border-slate-800 flex items-center justify-around py-2.5 pb-6 px-4 ring-1 ring-white/5"
      >
        {bottomLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link 
              key={link.to} 
              to={link.to}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-300",
                isActive ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-slate-800/40 rounded-xl -z-10 border border-slate-700/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <link.icon className={cn("h-5 w-5 mb-1 transition-transform duration-300", isActive && "scale-110")} />
              <span className="text-[10px] font-medium tracking-tight font-sans">{link.label}</span>
              {isActive && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 w-1 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"
                />
              )}
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
};

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import ServiceConsole from './pages/ServiceConsole';
import Community from './pages/Community';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} className="w-full">
        <Routes location={location}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/project/:projectId" element={<PageTransition><ProjectDetails /></PageTransition>} />
          <Route path="/service/:serviceId" element={<PageTransition><ServiceConsole /></PageTransition>} />
          <Route path="/community" element={<PageTransition><Community /></PageTransition>} />
          <Route path="/wallet" element={<PageTransition><Wallet /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
          {/* Fallback to dashboard */}
          <Route path="*" element={<PageTransition><Home /></PageTransition>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        // Auto-provision or fetch developer profile
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            // Update active timestamp
            await updateDoc(docRef, { lastActive: serverTimestamp() });
          } else {
            // New Developer Account with $50.00 credentials
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Vortex Developer',
              photoURL: user.photoURL || undefined,
              role: 'developer',
              githubUsername: '',
              balance: 50.00,
              createdAt: serverTimestamp()
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Profile auto-provision/fetch error:", error);
        }
        
        // Setup listener for updates (e.g. balance changes)
        const unsubListener = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        });
        
        setLoading(false);
        return () => unsubListener();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    await loginWithGoogle();
  };

  const logout = async () => {
    await auth.signOut();
  };

  const updateGithub = async (username: string) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, { githubUsername: username });
  };

  const authValue = { user, profile, loading, login, logout, updateGithub };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#050810]">
      <div className="flex flex-col items-center gap-4">
        <Terminal className="h-10 w-10 text-cyan-400 animate-spin" />
        <p className="text-slate-400 font-medium font-mono text-xs uppercase tracking-widest">Spinning up container pods...</p>
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
          <Navbar />
          <main className="flex-grow pb-24 md:pb-0">
            <React.Suspense fallback={
              <div className="flex items-center justify-center min-h-[60vh] bg-[#050810]">
                <div className="flex flex-col items-center gap-4">
                  <Terminal className="h-8 w-8 text-cyan-400 animate-pulse" />
                  <p className="text-xs font-mono text-slate-500 tracking-wider">Syncing Cluster Node...</p>
                </div>
              </div>
            }>
              <AnimatedRoutes />
            </React.Suspense>
          </main>
          <BottomNavigation />
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
