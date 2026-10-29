import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Check, X, Calendar, Trash2, CheckCircle2, 
  DollarSign, Video, ShieldCheck, AlertCircle 
} from 'lucide-react';
import { Notification, Match } from '../types';
import { LANGUAGES } from '../constants';
import { format } from 'date-fns';

interface NotificationCenterProps {
  notifications: Notification[];
  matches: Match[];
  language: keyof typeof LANGUAGES;
  onAccept: (notifId: string, matchId: string) => void;
  onDecline: (notifId: string) => void;
  onDeleteNotification?: (notifId: string) => void;
  onClearAllNotifications?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  matches,
  language,
  onAccept,
  onDecline,
  onDeleteNotification,
  onClearAllNotifications,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const unreadCount = notifications.filter(n => n.status === 'pending').length;

  const t = {
    en: {
      title: 'Notifications',
      empty: 'No new notifications',
      invite: 'invited you to a match',
      promotion: 'You have been promoted from the waiting list!',
      cancelled: 'Match Cancelled!',
      cancelledMsg: 'The organizer has cancelled this match.',
      accept: 'Accept',
      decline: 'Decline',
      delete: 'Delete notification',
      clearAll: 'Clear all',
      paymentConfirmed: 'Payment Confirmed!',
      subscriptionActive: 'Monthly Subscription Active!',
      liveUnlocked: 'Live Stream Unlocked!',
    },
    pt: {
      title: 'Notificações',
      empty: 'Sem novas notificações',
      invite: 'convidou você para uma partida',
      promotion: 'Você foi promovido da lista de espera!',
      cancelled: 'Partida Cancelada!',
      cancelledMsg: 'O organizador cancelou esta partida.',
      accept: 'Aceitar',
      decline: 'Recusar',
      delete: 'Eliminar notificação',
      clearAll: 'Limpar todas',
      paymentConfirmed: 'Pagamento Confirmado!',
      subscriptionActive: 'Mensalidade Ativada!',
      liveUnlocked: 'Live Stream Liberada!',
    },
    xh: {
      title: 'Switiviso',
      empty: 'Ku hava switiviso swintshwa',
      invite: 'u ku rhambile eka ntlangu',
      promotion: 'U tlakusiwile eka nxaxamelo wa ku rindza!',
      cancelled: 'Ntlangu wu tshikiwile!',
      cancelledMsg: 'Muhleri u tshikile ntlangu lowu.',
      accept: 'Amukela',
      decline: 'Yala',
      delete: 'Sula xitiviso',
      clearAll: 'Sula hinkwaswo',
      paymentConfirmed: 'Hakelo ri tiyisisiwile!',
      subscriptionActive: "Nyiko ya n'hweti yi pfuriwile!",
      liveUnlocked: 'Vhidiyo ya Live yi pfuriwile!',
    },
  }[language === 'xangana' ? 'xh' : language];

  return (
    <div className="relative">
      <button
        id="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
        title={t.title}
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-emerald-600 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-black/10 z-50 overflow-hidden"
            >
              {/* Header with Clear All option */}
              <div className="p-3.5 border-b border-black/5 bg-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-emerald-950 text-sm">{t.title}</h3>
                  {notifications.length > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-emerald-200/80 text-emerald-800 px-1.5 py-0.5 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </div>

                {notifications.length > 0 && onClearAllNotifications && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(language === 'pt' ? 'Deseja eliminar todas as notificações?' : 'Clear all notifications?')) {
                        onClearAllNotifications();
                      }
                    }}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title={t.clearAll}
                  >
                    <Trash2 size={12} />
                    <span>{t.clearAll}</span>
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                    <Bell className="w-8 h-8 text-gray-300 opacity-60" />
                    <span>{t.empty}</span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const match = notif.matchId ? matches.find(m => m.id === notif.matchId) : undefined;
                    const isPayment = notif.type === 'payment_confirmed' || notif.type === 'subscription_active';
                    const isLive = notif.type === 'live_ticket_unlocked';

                    return (
                      <div
                        key={notif.id}
                        className={`p-3.5 transition-colors relative group ${
                          notif.status === 'pending' ? 'bg-white' : 'bg-gray-50/70 opacity-80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon based on notification category */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            isPayment 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : isLive 
                              ? 'bg-rose-100 text-rose-700' 
                              : notif.type === 'match_cancelled' 
                              ? 'bg-red-100 text-red-700' 
                              : notif.type === 'waiting_list_promotion' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isPayment ? (
                              <ShieldCheck size={18} />
                            ) : isLive ? (
                              <Video size={18} />
                            ) : notif.type === 'match_cancelled' ? (
                              <AlertCircle size={18} />
                            ) : (
                              <Calendar size={18} />
                            )}
                          </div>

                          {/* Content Body */}
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <p className="text-xs font-black text-gray-900 truncate">
                                {notif.title || (
                                  notif.type === 'invite' 
                                    ? 'Convite para Partida' 
                                    : notif.type === 'waiting_list_promotion' 
                                    ? t.promotion 
                                    : notif.type === 'match_cancelled' 
                                    ? t.cancelled 
                                    : 'Notificação'
                                )}
                              </p>
                              {notif.createdAt && (
                                <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                  {format(notif.createdAt, 'dd/MM HH:mm')}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-600 leading-snug">
                              {notif.message ? (
                                notif.message
                              ) : notif.type === 'invite' ? (
                                <><span className="font-bold">Craque do Bairro</span> {t.invite}</>
                              ) : notif.type === 'waiting_list_promotion' ? (
                                <span>{t.promotion}</span>
                              ) : notif.type === 'match_cancelled' ? (
                                <span>{t.cancelledMsg}</span>
                              ) : (
                                ''
                              )}
                            </p>

                            {match && (
                              <p className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-1">
                                <Calendar size={11} className="text-gray-400" />
                                <span>{format(match.date, 'PPP')} @ {format(match.date, 'HH:mm')}</span>
                              </p>
                            )}

                            {/* Invite Action Buttons */}
                            {notif.status === 'pending' && notif.type === 'invite' && notif.matchId && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => onAccept(notif.id, notif.matchId!)}
                                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Check size={13} /> {t.accept}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDecline(notif.id)}
                                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <X size={13} /> {t.decline}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Delete individual notification button */}
                          {onDeleteNotification && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNotification(notif.id);
                              }}
                              className="absolute top-3.5 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title={t.delete}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
