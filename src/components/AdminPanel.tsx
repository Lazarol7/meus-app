import React from 'react';
import { UserProfile } from '../types';
import { LANGUAGES, Language } from '../constants';
import { Shield, ShieldAlert, User, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  users: UserProfile[];
  currentUser: UserProfile;
  lang: Language;
  onUpdateRole: (userId: string, role: 'user' | 'admin') => void;
}

export function AdminPanel({ users, currentUser, lang, onUpdateRole }: AdminPanelProps) {
  const t = LANGUAGES[lang];

  // Only the super admin can manage other admins
  const isSuperAdmin = currentUser.email === 'lazaroatalia80@gmail.com';

  return (
    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{lang === 'pt' ? 'Painel de Administração' : 'Admin Panel'}</h3>
          <p className="text-xs text-gray-500">{lang === 'pt' ? 'Gerir permissões de utilizadores' : 'Manage user permissions'}</p>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {users.filter(u => u.uid !== currentUser.uid).map(user => (
          <div key={user.uid} className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="w-10 h-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                  {user.displayName[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-gray-900">{user.displayName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user.role === 'admin' ? (
                <button
                  onClick={() => isSuperAdmin && onUpdateRole(user.uid, 'user')}
                  disabled={!isSuperAdmin}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    isSuperAdmin ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <ShieldAlert size={14} />
                  {lang === 'pt' ? 'Remover Admin' : 'Remove Admin'}
                </button>
              ) : (
                <button
                  onClick={() => isSuperAdmin && onUpdateRole(user.uid, 'admin')}
                  disabled={!isSuperAdmin}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    isSuperAdmin ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <Shield size={14} />
                  {lang === 'pt' ? 'Tornar Admin' : 'Make Admin'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!isSuperAdmin && (
        <p className="text-[10px] text-center text-gray-400 bg-gray-50 p-2 rounded-lg">
          {lang === 'pt' ? 'Apenas o administrador principal pode gerir outros administradores.' : 'Only the main administrator can manage other administrators.'}
        </p>
      )}
    </div>
  );
}
