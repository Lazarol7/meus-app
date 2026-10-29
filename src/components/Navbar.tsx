import React from 'react';
import { LANGUAGES, Language } from '../constants';
import { Home, Calendar, BarChart3, Settings, LogOut, User, DollarSign, Shield, Bell, Megaphone, Building2, MessageSquareWarning } from 'lucide-react';
import { cn } from '../lib/utils';

export type NavigationTab = 'home' | 'matches' | 'stats' | 'clubs' | 'notifications' | 'ads' | 'licenses' | 'complaints' | 'finance' | 'settings';

interface NavbarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  lang: Language;
  userPhoto?: string;
  onLogout: () => void;
  notificationsCount?: number;
  children?: React.ReactNode;
}

export function Navbar({ activeTab, onTabChange, lang, userPhoto, onLogout, notificationsCount = 0, children }: NavbarProps) {
  const t = LANGUAGES[lang];

  const navItems = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'matches', label: t.matches, icon: Calendar },
    { id: 'stats', label: t.stats, icon: BarChart3 },
    { id: 'clubs', label: lang === 'pt' ? 'Clubes' : 'Clubs', icon: Shield },
    { id: 'notifications', label: lang === 'pt' ? 'Avisos' : 'Notices', icon: Bell, badge: notificationsCount },
    { id: 'ads', label: lang === 'pt' ? 'Anúncios' : 'Ads', icon: Megaphone },
    { id: 'licenses', label: lang === 'pt' ? 'Ligas' : 'Leagues', icon: Building2 },
    { id: 'complaints', label: lang === 'pt' ? 'Reclamações' : 'Support', icon: MessageSquareWarning },
    { id: 'finance', label: t.finance, icon: DollarSign },
    { id: 'settings', label: t.settings, icon: Settings },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-black/5 px-3 sm:px-6 py-2.5 pb-7 md:pb-2.5">
      <div className="max-w-2xl mx-auto flex justify-between items-center gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as NavigationTab)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 relative py-1 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer",
              activeTab === item.id
                ? "text-emerald-600 scale-105 font-black"
                : "text-gray-400 hover:text-gray-600 font-semibold"
            )}
          >
            <div className="relative">
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "fill-emerald-100/50 stroke-[2.5]" : "stroke-[1.8]"
              )} />
              {('badge' in item) && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
          </button>
        ))}

        <div className="flex items-center gap-4">
          {children}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-red-500 transition-all"
          >
            {userPhoto ? (
              <img
                src={userPhoto}
                alt="User"
                className="w-6 h-6 rounded-full border border-gray-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-6 h-6" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest">{t.logout}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
