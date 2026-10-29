import React from 'react';
import { Registration, UserProfile } from '../types';
import { LANGUAGES, Language } from '../constants';
import { CheckCircle2, XCircle, DollarSign, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface PaymentStatusProps {
  registrations: (Registration & { user?: UserProfile })[];
  lang: Language;
  onTogglePaid?: (regId: string, currentStatus: boolean) => void;
  onPlayerClick?: (player: UserProfile) => void;
  isOrganizer?: boolean;
}

export function PaymentStatus({ registrations, lang, onTogglePaid, onPlayerClick, isOrganizer }: PaymentStatusProps) {
  const t = LANGUAGES[lang];
  const totalPaid = registrations.filter(r => r.paid).length;
  const totalAmount = registrations.length;

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center">
          <DollarSign className="w-5 h-5 text-emerald-600 mr-2" />
          <h3 className="font-bold text-gray-900">{t.finance}</h3>
        </div>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
          {totalPaid} / {totalAmount} {t.paid}
        </span>
      </div>

      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
        {registrations.map((reg) => (
          <div key={reg.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div 
              className="flex items-center cursor-pointer flex-1"
              onClick={() => reg.user && onPlayerClick?.(reg.user)}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs mr-3">
                {reg.user?.displayName?.[0] || '?'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{reg.user?.displayName || 'Jogador'}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                  {reg.status === 'confirmed' ? t.confirm : t.waitingList}
                </span>
              </div>
            </div>

            <button
              disabled={!isOrganizer}
              onClick={() => onTogglePaid?.(reg.id, reg.paid)}
              className={cn(
                "flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                reg.paid
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              )}
            >
              {reg.paid ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1.5" />
                  {t.paid}
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1.5" />
                  {t.pending}
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
