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
  Plus,
  Triangle,
  Loader2
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

  const isPublicRoute = ['/', '/features', '/pricing', '/docs'].includes(location.pathname);

  const publicLinks = [
    { to: "/features", label: 'Features', show: true, icon: Activity },
    { to: "/pricing", label: 'Pricing', show: true, icon: DollarSign },
    { to: "/docs", label: 'Docs', show: true, icon: Terminal },
  ];

  const dashboardLinks = [
    { to: "/dashboard", label: 'Overview', show: !!user, icon: LayoutDashboard },
    { to: "/community", label: 'Community', show: true, icon: Globe },
    { to: "/wallet", label: 'Billing', show: !!user, icon: DollarSign },
    { to: "/admin", label: 'Admin', show: profile?.role === 'admin' || user?.email === 'oladoyeheritage445@gmail.com', icon: Lock },
  ];

  const activeLinks = isPublicRoute && !user ? publicLinks : dashboardLinks;

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <Triangle className="h-5 w-5 text-text-primary fill-white" />
              <span className="text-sm font-semibold tracking-tight text-text-primary leading-tight">Deploy by Kontyra</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2 ml-6">
            {activeLinks.filter(link => link.show).map(link => (
              <Link 
                key={link.to}
                to={link.to} 
                className="relative px-3 py-1.5 rounded-md transition-colors duration-200 hover:bg-card"
              >
                <span className={`text-sm transition-colors duration-200 ${
                  location.pathname === link.to ? 'text-text-primary font-medium' : 'text-text-secondary'
                }`}>
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3 md:gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {isPublicRoute && (
                  <Link to="/dashboard" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
                    Dashboard
                  </Link>
                )}
                <Link to="/settings" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-[var(--radius-pill)] bg-card overflow-hidden border border-border transition-colors hover:border-zinc-500">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="h-full w-full p-1.5 text-text-secondary" />
                    )}
                  </div>
                </Link>
                <button 
                  onClick={logout} 
                  className="p-1.5 text-muted hover:text-text-secondary transition-colors hidden sm:block"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                  Log In
                </Link>
                <Link 
                  to="/register"
                  className="bg-primary text-text-primary hover:bg-secondary px-4 py-1.5 rounded-md text-sm font-medium hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  Sign Up
                </Link>
              </div>
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
    { to: user ? "/settings" : "/dashboard", icon: user ? UserIcon : LogOut, label: user ? 'Profile' : 'Get Started' }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 pointer-events-auto">
      <div className="bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-around py-3 pb-6 px-4">
        {bottomLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link 
              key={link.to} 
              to={link.to}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-[var(--radius-card)] transition-all duration-300",
                isActive ? "text-text-primary" : "text-muted hover:text-text-secondary"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-card rounded-[var(--radius-card)] -z-10" />
              )}
              <link.icon className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// Pages
import Home from './pages/Home';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Docs from './pages/Docs';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateProject from './pages/CreateProject';
import ProjectDetails from './pages/ProjectDetails';
import CreateDeployment from './pages/CreateDeployment';
import DeploymentDetails from './pages/DeploymentDetails';
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
          <Route path="/features" element={<PageTransition><Features /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/docs" element={<PageTransition><Docs /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/projects/new" element={<PageTransition><CreateProject /></PageTransition>} />
          <Route path="/projects/:projectId/*" element={<PageTransition><ProjectDetails /></PageTransition>} />
          <Route path="/projects/:projectId/deploy" element={<PageTransition><CreateDeployment /></PageTransition>} />
          <Route path="/deployment/:deploymentId" element={<PageTransition><DeploymentDetails /></PageTransition>} />
          <Route path="/community" element={<PageTransition><Community /></PageTransition>} />
          <Route path="/wallet" element={<PageTransition><Wallet /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Profile /></PageTransition>} />
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
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 text-muted animate-spin" />
    </div>
  );

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-background text-text-primary font-sans selection:bg-zinc-800 selection:text-text-primary">
          <Navbar />
          <main className="flex-grow pb-24 md:pb-0">
            <React.Suspense fallback={
              <div className="flex items-center justify-center min-h-[60vh] bg-background">
                <Loader2 className="h-6 w-6 text-muted animate-spin" />
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
