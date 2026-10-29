import React, { useState, useMemo } from 'react';
import { CommunityNotification, UserProfile, CommunityLeague, LicensePayment } from '../types';
import { Language, LANGUAGES } from '../constants';
import { 
  Bell, Plus, Search, Megaphone, AlertTriangle, Trophy, 
  Calendar, Shield, Heart, Trash2, Clock, Check, X,
  Share2, Sparkles, Filter, Pin, Lock, Smartphone, Copy, CheckCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface CommunityNotificationsProps {
  notifications: CommunityNotification[];
  currentUser: UserProfile | null;
  lang: Language;
  onSaveNotification: (data: Omit<CommunityNotification, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onLikeNotification?: (id: string) => Promise<void>;
  onRequestLogin?: () => void;
  communityLeagues?: CommunityLeague[];
  licensePayments?: LicensePayment[];
  onOpenLicenses?: () => void;
  onSubmitMonthlyPayment?: (data: {
    leagueName: string;
    phoneNumber: string;
    paymentMethod: 'mpesa' | 'emola';
    reference: string;
    notes?: string;
  }) => Promise<void>;
}

type NotificationCategory = 'all' | 'general' | 'match' | 'tournament' | 'alert' | 'club';

export function CommunityNotifications({
  notifications,
  currentUser,
  lang,
  onSaveNotification,
  onDeleteNotification,
  onLikeNotification,
  onRequestLogin,
  communityLeagues = [],
  licensePayments = [],
  onOpenLicenses,
  onSubmitMonthlyPayment,
}: CommunityNotificationsProps) {
  const isPt = lang === 'pt';
  const dateLocale = isPt ? ptBR : enUS;

  // Administrator recognition: 100% free access
  const isAdmin = currentUser?.role === 'admin' || 
    currentUser?.email === 'lazaroatalia80@gmail.com' || 
    currentUser?.email === 'lazaratala80@gmail.com';

  // Check if user has active monthly license to post news about their league
  const hasActiveLeagueLicense = useMemo(() => {
    if (isAdmin) return true; // Administrator is 100% free
    if (!currentUser) return false;

    // Check user profile subscription status
    if (currentUser.subscriptionStatus === 'active' && (currentUser.subscriptionExpiresAt || 0) > Date.now()) {
      return true;
    }

    // Check if user was explicitly authorized by Master Admin to post content
    if (currentUser.canPostContent || currentUser.canPostNews) {
      return true;
    }

    // Check if user is associated with an active community league
    if (communityLeagues && communityLeagues.length > 0) {
      const activeLg = communityLeagues.find(l => 
        l.status === 'active' && 
        l.expiresAt > Date.now() && 
        (l.responsibleAdminEmail?.toLowerCase() === currentUser.email?.toLowerCase() || l.adminUserId === currentUser.uid)
      );
      if (activeLg) return true;
    }

    return false;
  }, [isAdmin, currentUser, communityLeagues]);

  // Check if user has a pending monthly payment waiting for admin confirmation
  const hasPendingMonthlyPayment = useMemo(() => {
    if (!currentUser || !licensePayments) return false;
    return licensePayments.some(p => 
      p.status === 'pending' && 
      (p.userId === currentUser.uid || p.userEmail?.toLowerCase() === currentUser.email?.toLowerCase())
    );
  }, [currentUser, licensePayments]);

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [showMonthlyGateModal, setShowMonthlyGateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Monthly Payment Submission Form states inside the gate modal
  const [payLeagueName, setPayLeagueName] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [payMethod, setPayMethod] = useState<'mpesa' | 'emola'>('mpesa');
  const [payReference, setPayReference] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSubmittedSuccess, setPaymentSubmittedSuccess] = useState(false);

  // Notice Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [noticeLeagueName, setNoticeLeagueName] = useState('');
  const [category, setCategory] = useState<'general' | 'match' | 'tournament' | 'alert' | 'club'>('general');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [authorName, setAuthorName] = useState(currentUser?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCopyPhone = (num: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedPhone(num);
      setTimeout(() => setCopiedPhone(null), 2500);
    }
  };

  // Open Write Modal with permission check
  const handleOpenWriteModal = () => {
    if (!currentUser) {
      if (onRequestLogin) onRequestLogin();
      return;
    }

    // If user is not admin and doesn't have an active monthly license
    if (!isAdmin && !hasActiveLeagueLicense) {
      setShowMonthlyGateModal(true);
      return;
    }

    setTitle('');
    setMessage('');
    setNoticeLeagueName('');
    setCategory('general');
    setPriority('normal');
    setAuthorName(currentUser?.displayName || (isPt ? 'Membro da Comunidade' : 'Community Member'));
    setFormError(null);
    setIsWriteModalOpen(true);
  };

  const handleSendMonthlyPaymentFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payLeagueName.trim()) {
      alert(isPt ? 'Por favor insira o nome da sua Liga / Campeonato.' : 'Please enter your League name.');
      return;
    }
    if (!payPhone.trim() || payPhone.trim().length < 8) {
      alert(isPt ? 'Por favor insira um contacto telefónico válido.' : 'Please enter a valid phone number.');
      return;
    }
    if (!payReference.trim()) {
      alert(isPt ? 'Por favor insira o código ou mensagem do SMS de confirmação da transferência.' : 'Please enter the transfer reference.');
      return;
    }

    if (onSubmitMonthlyPayment) {
      setIsSubmittingPayment(true);
      try {
        await onSubmitMonthlyPayment({
          leagueName: payLeagueName.trim(),
          phoneNumber: payPhone.trim(),
          paymentMethod: payMethod,
          reference: payReference.trim(),
        });
        setPaymentSubmittedSuccess(true);
      } catch (err) {
        console.error('Error submitting payment request:', err);
        alert(isPt ? 'Erro ao enviar comprovativo. Tente novamente.' : 'Failed to submit payment.');
      } finally {
        setIsSubmittingPayment(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError(isPt ? 'Por favor insira um título.' : 'Please enter a title.');
      return;
    }
    if (!message.trim()) {
      setFormError(isPt ? 'Por favor escreva a mensagem da notificação.' : 'Please enter the notification message.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSaveNotification({
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        authorName: authorName.trim() || (currentUser?.displayName || 'Comunidade'),
        authorId: currentUser?.uid,
        authorPhoto: currentUser?.photoURL,
        likes: 0,
        likedBy: [],
      });
      setIsWriteModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError(isPt ? 'Erro ao publicar notificação. Tente novamente.' : 'Failed to post notification. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((notif) => {
        // Category filter
        if (activeCategory !== 'all') {
          if (activeCategory === 'alert' && notif.priority === 'urgent') return true;
          if (notif.category !== activeCategory) return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = notif.title.toLowerCase().includes(q);
          const matchMsg = notif.message.toLowerCase().includes(q);
          const matchAuthor = notif.authorName.toLowerCase().includes(q);
          if (!matchTitle && !matchMsg && !matchAuthor) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Urgent notifications at the top, then by timestamp desc
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [notifications, activeCategory, searchQuery]);

  const handleShare = (notif: CommunityNotification) => {
    const text = `📢 ${notif.title}\n\n${notif.message}\n— Publicado por ${notif.authorName} no BeSoccer Bairro`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(notif.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const getCategoryBadge = (cat?: string, priority?: string) => {
    if (priority === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider animate-pulse">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          {isPt ? 'Urgente' : 'Urgent'}
        </span>
      );
    }

    switch (cat) {
      case 'tournament':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
            <Trophy className="w-3 h-3 text-amber-600" />
            {isPt ? 'Torneio' : 'Tournament'}
          </span>
        );
      case 'match':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
            <Calendar className="w-3 h-3 text-emerald-600" />
            {isPt ? 'Partida' : 'Match'}
          </span>
        );
      case 'club':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
            <Shield className="w-3 h-3 text-purple-600" />
            {isPt ? 'Clube' : 'Club'}
          </span>
        );
      case 'general':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
            <Megaphone className="w-3 h-3 text-blue-600" />
            {isPt ? 'Aviso Geral' : 'General Notice'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          HERO BANNER
          ========================================================================= */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-emerald-200 text-xs font-black uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
              <span>{isPt ? 'Mural Aberto · Notificações Públicas' : 'Public Community Wall'}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {isPt ? 'Quadro de Notificações & Avisos' : 'Notifications & Announcements'}
            </h2>
            <p className="text-emerald-100 text-xs md:text-sm max-w-xl">
              {isPt
                ? 'Qualquer pessoa pode acompanhar as novidades, convocações, torneios e comunicados dos clubes e peladas.'
                : 'Anyone can view latest updates, call-ups, tournaments, and announcements from local clubs and matches.'}
            </p>
          </div>

          <button
            onClick={handleOpenWriteModal}
            className="self-start md:self-center inline-flex items-center gap-2 px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isPt ? 'Escrever Notificação' : 'Write Notice'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          FILTERS & SEARCH BAR
          ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isPt ? 'Pesquisar avisos por título, conteúdo ou autor...' : 'Search notices by title, message, or author...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-800 bg-gray-50/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: isPt ? 'Todas as Notificações' : 'All Notices', count: notifications.length },
            { id: 'general', label: isPt ? 'Avisos Gerais' : 'General', count: notifications.filter(n => n.category === 'general').length },
            { id: 'tournament', label: isPt ? 'Torneios' : 'Tournaments', count: notifications.filter(n => n.category === 'tournament').length },
            { id: 'match', label: isPt ? 'Partidas' : 'Matches', count: notifications.filter(n => n.category === 'match').length },
            { id: 'club', label: isPt ? 'Clubes' : 'Clubs', count: notifications.filter(n => n.category === 'club').length },
            { id: 'alert', label: isPt ? 'Urgentes' : 'Urgent', count: notifications.filter(n => n.priority === 'urgent').length },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as NotificationCategory)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                activeCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200/80"
              )}
            >
              <span>{cat.label}</span>
              {cat.count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                  activeCategory === cat.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                )}>
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          NOTIFICATIONS FEED
          ========================================================================= */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-black/5 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <Megaphone className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-1">
                {isPt ? 'Nenhuma notificação encontrada' : 'No notifications found'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {searchQuery || activeCategory !== 'all'
                  ? (isPt ? 'Tente mudar os filtros ou o termo de pesquisa.' : 'Try changing filters or search terms.')
                  : (isPt ? 'O mural está silencioso por enquanto. Escreva a primeira notificação e todos poderão ler!' : 'The notice board is quiet. Write the first notice and everyone can see it!')}
              </p>
            </div>
            <button
              onClick={handleOpenWriteModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isPt ? 'Escrever Notificação Agora' : 'Write Notice Now'}</span>
            </button>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isAuthor = currentUser && notif.authorId === currentUser.uid;
            const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'lazaroatalia80@gmail.com';
            const canDelete = isAuthor || isAdmin || (!notif.authorId && !!currentUser);
            const isLiked = currentUser && notif.likedBy?.includes(currentUser.uid);

            let relativeTime = '';
            try {
              relativeTime = formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: dateLocale });
            } catch (e) {
              relativeTime = format(notif.createdAt, 'dd/MM/yyyy HH:mm');
            }

            return (
              <motion.article
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn(
                  "bg-white rounded-3xl p-5 md:p-6 border shadow-xs transition-all hover:shadow-md relative",
                  notif.priority === 'urgent'
                    ? "border-red-300 ring-1 ring-red-200/50 bg-gradient-to-b from-red-50/30 to-white"
                    : "border-black/5"
                )}
              >
                {/* Top Row: Author Info & Category Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {notif.authorPhoto ? (
                      <img
                        src={notif.authorPhoto}
                        alt={notif.authorName}
                        className="w-10 h-10 rounded-full object-cover border border-emerald-200 shrink-0 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-200">
                        {notif.authorName ? notif.authorName[0].toUpperCase() : 'B'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm truncate">
                          {notif.authorName}
                        </span>
                        {notif.priority === 'urgent' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-red-600 bg-red-100 px-1.5 py-0.2 rounded-md">
                            <Pin className="w-2.5 h-2.5 fill-red-500" />
                            {isPt ? 'Destaque' : 'Pinned'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{relativeTime}</span>
                        <span>·</span>
                        <span>{format(notif.createdAt, 'HH:mm')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {getCategoryBadge(notif.category, notif.priority)}
                  </div>
                </div>

                {/* Content: Title & Message */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-base md:text-lg font-black text-gray-900 leading-snug">
                    {notif.title}
                  </h4>
                  <p className="text-xs md:text-sm text-gray-700 whitespace-pre-line leading-relaxed font-normal">
                    {notif.message}
                  </p>
                </div>

                {/* Footer Actions: Like, Share, Delete */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    {/* Like button */}
                    <button
                      onClick={() => onLikeNotification && onLikeNotification(notif.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer",
                        isLiked 
                          ? "bg-rose-50 text-rose-600 border border-rose-200" 
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                      )}
                      title={isPt ? 'Curtir notificação' : 'Like'}
                    >
                      <Heart className={cn("w-3.5 h-3.5", isLiked ? "fill-rose-500 text-rose-600" : "")} />
                      <span className="text-xs">{notif.likes || 0}</span>
                    </button>

                    {/* Share / Copy button */}
                    <button
                      onClick={() => handleShare(notif)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100 font-bold transition-all cursor-pointer"
                      title={isPt ? 'Partilhar / Copiar aviso' : 'Share'}
                    >
                      {copiedId === notif.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold text-xs">{isPt ? 'Copiado!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs">{isPt ? 'Partilhar' : 'Share'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {canDelete && (
                    <div className="flex items-center gap-1">
                      {confirmDeleteId === notif.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200 animate-in fade-in">
                          <span className="text-[10px] font-bold text-red-700 px-1">
                            {isPt ? 'Eliminar aviso?' : 'Delete notice?'}
                          </span>
                          <button
                            type="button"
                            disabled={isDeletingId === notif.id}
                            onClick={async () => {
                              try {
                                setIsDeletingId(notif.id);
                                await onDeleteNotification(notif.id);
                              } finally {
                                setIsDeletingId(null);
                                setConfirmDeleteId(null);
                              }
                            }}
                            className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            {isDeletingId === notif.id ? '...' : (isPt ? 'Sim' : 'Yes')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            {isPt ? 'Não' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(notif.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title={isPt ? 'Eliminar Notificação / Aviso' : 'Delete Notice'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })
        )}
      </div>

      {/* =========================================================================
          WRITE NOTIFICATION MODAL
          ========================================================================= */}
      <AnimatePresence>
        {isWriteModalOpen && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-t-[32px] md:rounded-[32px] p-6 max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">
                      {isPt ? 'Escrever Notificação' : 'Write Notice'}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {isPt ? 'Qualquer pessoa da comunidade poderá ver' : 'Everyone in the community will be able to see'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsWriteModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {isPt ? 'Título da Notificação *' : 'Notice Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isPt ? 'Ex: Grande final do Torneio neste sábado!' : 'Ex: Tournament Grand Final this Saturday!'}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-gray-900"
                    maxLength={150}
                  />
                </div>

                {/* Category & Priority in grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      {isPt ? 'Categoria' : 'Category'}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-gray-800 bg-white"
                    >
                      <option value="general">{isPt ? '📢 Aviso Geral' : '📢 General Notice'}</option>
                      <option value="match">{isPt ? '⚽ Partida / Pelada' : '⚽ Match'}</option>
                      <option value="tournament">{isPt ? '🏆 Torneio / Campeonato' : '🏆 Tournament'}</option>
                      <option value="club">{isPt ? '🛡️ Notícia de Clube' : '🛡️ Club News'}</option>
                      <option value="alert">{isPt ? '⚠️ Alerta Comunitário' : '⚠️ Community Alert'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      {isPt ? 'Prioridade' : 'Priority'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPriority('normal')}
                        className={cn(
                          "py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center",
                          priority === 'normal'
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-black"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {isPt ? 'Normal' : 'Normal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority('urgent')}
                        className={cn(
                          "py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center",
                          priority === 'urgent'
                            ? "bg-red-50 border-red-500 text-red-800 font-black"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {isPt ? '🚨 Urgente' : '🚨 Urgent'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Message / Textarea */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {isPt ? 'Mensagem / Detalhes *' : 'Message / Details *'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isPt ? 'Escreva todos os detalhes da notificação (horários, convocados, campo, novidades)...' : 'Write the details of the notice...'}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900 resize-none"
                    maxLength={2000}
                  />
                  <div className="text-[11px] text-gray-400 text-right mt-1">
                    {message.length} / 2000
                  </div>
                </div>

                {/* Author Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {isPt ? 'Publicado por' : 'Posted By'}
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={currentUser?.displayName || 'O teu nome'}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-gray-800"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsWriteModalOpen(false)}
                    className="flex-1 py-3 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    {isPt ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4" />
                        <span>{isPt ? 'Publicar Notificação' : 'Publish Notice'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Monthly License Paywall / Request Confirmation */}
        {showMonthlyGateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100"
            >
              <button
                onClick={() => {
                  setShowMonthlyGateModal(false);
                  setPaymentSubmittedSuccess(false);
                }}
                className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-2 mb-5">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-sm">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                  {isPt ? 'Publicação de Notícias da Liga' : 'League News Publishing'}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                  {isPt
                    ? 'Para postar comunicados, avisos de jogos e novidades sobre a sua liga, a mensalidade de 600 MT deve estar confirmada pelo Administrador.'
                    : 'To post news and notices for your league, the 600 MT monthly fee must be confirmed by the Administrator.'}
                </p>
              </div>

              {paymentSubmittedSuccess || hasPendingMonthlyPayment ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 text-center">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">
                      {isPt ? 'Comprovativo em Análise' : 'Payment Under Review'}
                    </h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      {isPt
                        ? 'O seu comprovativo da mensalidade (600 MT) foi recebido e aguarda confirmação pelo Administrador Lázaro Atalia. Assim que for validado, o app será libertado para postar sobre a sua liga!'
                        : 'Your 600 MT payment receipt was received and is awaiting Admin confirmation. Once validated, your league news publishing will be unlocked!'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMonthlyGateModal(false)}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    {isPt ? 'Entendido' : 'Got it'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Official payment numbers card */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        {isPt ? 'Destinatário Oficial (600 MT)' : 'Official Recipient (600 MT)'}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Titular: Lázaro Atalia
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* e-Mola */}
                      <div className="p-2.5 rounded-xl bg-white border border-amber-200 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-amber-600 uppercase">e-Mola (Movitel)</div>
                          <div className="font-mono font-black text-gray-900 text-xs">87 88 030 93</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone('878803093')}
                          className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                          title="Copiar número"
                        >
                          {copiedPhone === '878803093' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* M-Pesa */}
                      <div className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-rose-600 uppercase">M-Pesa (Vodacom)</div>
                          <div className="font-mono font-black text-gray-900 text-xs">85 619 79 09</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone('856197909')}
                          className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                          title="Copiar número"
                        >
                          {copiedPhone === '856197909' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submission form */}
                  <form onSubmit={handleSendMonthlyPaymentFromModal} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        {isPt ? 'Nome da Sua Liga / Campeonato *' : 'League / Championship Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={payLeagueName}
                        onChange={(e) => setPayLeagueName(e.target.value)}
                        placeholder={isPt ? 'Ex: Taça Chamanculo, Liga Bairro Central...' : 'e.g. Central Cup...'}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          {isPt ? 'Método Usado' : 'Method'}
                        </label>
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value as any)}
                          className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="mpesa">M-Pesa (85 619 79 09)</option>
                          <option value="emola">e-Mola (87 88 030 93)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          {isPt ? 'Seu Telefone *' : 'Your Phone *'}
                        </label>
                        <input
                          type="tel"
                          required
                          value={payPhone}
                          onChange={(e) => setPayPhone(e.target.value)}
                          placeholder="84/85 ou 86/87..."
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        {isPt ? 'Código do SMS / Referência da Transferência *' : 'SMS Reference / Transfer ID *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={payReference}
                        onChange={(e) => setPayReference(e.target.value)}
                        placeholder="Ex: MP261027.1420.A01234"
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMonthlyGateModal(false)}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        {isPt ? 'Cancelar' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingPayment}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSubmittingPayment ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>{isPt ? 'Enviar Comprovativo' : 'Submit Receipt'}</span>
                            <CheckCircle size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
