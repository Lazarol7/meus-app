import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Calendar, 
  CreditCard, 
  Plus, 
  Smartphone, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Clock, 
  DollarSign, 
  Building2, 
  Mail, 
  Phone, 
  Award,
  Search,
  ExternalLink,
  Copy,
  Check,
  Send,
  X,
  UserCheck,
  Flame,
  Crown,
  Zap,
  UserPlus,
  Users
} from 'lucide-react';
import { CommunityLeague, LicensePayment, UserProfile } from '../types';

interface CommunityLicensePanelProps {
  currentUser: UserProfile | null;
  communityLeagues: CommunityLeague[];
  licensePayments: LicensePayment[];
  allUsers?: UserProfile[];
  onSaveLeague: (league: Partial<CommunityLeague>) => Promise<void>;
  onRenewLicense: (payment: Omit<LicensePayment, 'id' | 'paidAt'>, daysToAdd?: number) => Promise<void>;
  onToggleLeagueStatus: (leagueId: string, newStatus: 'active' | 'expired') => Promise<void>;
  onConfirmMonthlyPayment?: (payment: LicensePayment) => Promise<void>;
  onCancelOrSuspendLeague?: (leagueId: string, reason?: string) => Promise<void>;
  onSubmitPaymentRequest?: (data: {
    leagueName: string;
    phoneNumber: string;
    paymentMethod: 'mpesa' | 'emola';
    reference: string;
    notes?: string;
    leagueId?: string;
  }) => Promise<void>;
  onRejectPayment?: (paymentId: string, reason?: string) => Promise<void>;
  onLiberateUserByEmail?: (email: string, days?: number) => Promise<void>;
  onSuspendUserAdminByEmail?: (email: string) => Promise<void>;
  onToggleUserPostPermission?: (userId: string, currentVal: boolean) => Promise<void>;
}

export const CommunityLicensePanel: React.FC<CommunityLicensePanelProps> = ({
  currentUser,
  communityLeagues,
  licensePayments,
  allUsers = [],
  onSaveLeague,
  onRenewLicense,
  onToggleLeagueStatus,
  onConfirmMonthlyPayment,
  onCancelOrSuspendLeague,
  onSubmitPaymentRequest,
  onRejectPayment,
  onLiberateUserByEmail,
  onSuspendUserAdminByEmail,
  onToggleUserPostPermission,
}) => {
  // Super admin check for both administrator emails
  const isSuperAdmin = 
    currentUser?.email === 'lazaroatalia80@gmail.com' || 
    currentUser?.email === 'lazaratala80@gmail.com' || 
    currentUser?.role === 'admin';
  
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(
    communityLeagues[0]?.id || ''
  );
  const [showNewLeagueModal, setShowNewLeagueModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [leagueToRenew, setLeagueToRenew] = useState<CommunityLeague | null>(null);

  // Email Liberation Form state
  const [inputLiberateEmail, setInputLiberateEmail] = useState('');
  const [isLiberatingEmail, setIsLiberatingEmail] = useState(false);
  const [liberateSuccessMsg, setLiberateSuccessMsg] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<'all' | 'admins' | 'regular'>('all');

  // User Payment Proof Submission Modal
  const [showSubmitProofModal, setShowSubmitProofModal] = useState(false);
  const [userLeagueName, setUserLeagueName] = useState('');
  const [userPhone, setUserPhone] = useState(currentUser?.phoneNumber || '');
  const [userMethod, setUserMethod] = useState<'mpesa' | 'emola'>('mpesa');
  const [userReference, setUserReference] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofSuccessMsg, setProofSuccessMsg] = useState('');

  // Rejection modal
  const [rejectingPayment, setRejectingPayment] = useState<LicensePayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New League Form
  const [newName, setNewName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newMonthlyFee, setNewMonthlyFee] = useState(600);
  const [newNeighborhood, setNewNeighborhood] = useState('Bairro Central / Chamanculo');
  const [newCity, setNewCity] = useState('Maputo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Renewal Form
  const [renewMethod, setRenewMethod] = useState<'mpesa' | 'emola'>('mpesa');
  const [renewPhone, setRenewPhone] = useState('');
  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyPhone = (num: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedPhone(num);
      setTimeout(() => setCopiedPhone(null), 2500);
    }
  };

  const activeLeague = communityLeagues.find(l => l.id === selectedLeagueId) || communityLeagues[0];

  const filteredLeagues = communityLeagues.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.responsibleAdminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.neighborhood && l.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filtered users for email liberation center
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchesSearch = 
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.displayName && u.displayName.toLowerCase().includes(userSearchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      const isUserAdmin = u.role === 'admin' || 
        (u.subscriptionExpiresAt && u.subscriptionExpiresAt > Date.now()) ||
        u.email === 'lazaroatalia80@gmail.com' ||
        u.email === 'lazaratala80@gmail.com';

      if (userFilterRole === 'admins') return isUserAdmin;
      if (userFilterRole === 'regular') return !isUserAdmin;
      return true;
    });
  }, [allUsers, userSearchTerm, userFilterRole]);

  // Pending payments waiting for Admin confirmation
  const pendingPayments = licensePayments.filter(p => p.status === 'pending');

  const getStatusBadge = (status: 'active' | 'pending' | 'expired', expiresAt: number) => {
    const isPast = Date.now() > expiresAt;
    if (status === 'expired' || isPast) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          Licença Expirada (Bloqueado)
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Aguardando Confirmação
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        Licença Ativa (Liberada)
      </span>
    );
  };

  const calculateDaysRemaining = (expiresAt: number) => {
    const diffMs = expiresAt - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleOpenRenewal = (league: CommunityLeague) => {
    setLeagueToRenew(league);
    setRenewPhone(league.responsibleAdminPhone || '');
    setRenewMonths(1);
    setPaymentSuccessMsg('');
    setShowRenewalModal(true);
  };

  const handleProcessRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueToRenew) return;

    if (!renewPhone.trim() || renewPhone.trim().length < 8) {
      alert('Por favor insira um número de telefone válido (84/85 para M-Pesa ou 86/87 para e-Mola).');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const daysToAdd = renewMonths * 30;
      const feePerMonth = leagueToRenew.monthlyFee || 600;
      const totalAmount = feePerMonth * renewMonths;
      const ref = `${renewMethod.toUpperCase()}-${Date.now().toString().slice(-6)}`;
      
      const newValidUntil = Math.max(Date.now(), leagueToRenew.expiresAt) + daysToAdd * 24 * 60 * 60 * 1000;

      await onRenewLicense({
        leagueId: leagueToRenew.id,
        leagueName: leagueToRenew.name,
        amount: totalAmount,
        paymentMethod: renewMethod,
        phoneNumber: renewPhone,
        reference: ref,
        status: 'completed',
        validUntil: newValidUntil,
        processedBy: currentUser?.email || 'Sistema de Pagamento'
      }, daysToAdd);

      setPaymentSuccessMsg(`Pagamento de ${totalAmount} MT processado com sucesso via ${renewMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola'}! Referência: ${ref}. Licença estendida por ${daysToAdd} dias.`);
      setTimeout(() => {
        setShowRenewalModal(false);
        setLeagueToRenew(null);
        setPaymentSuccessMsg('');
      }, 2500);
    } catch (err) {
      console.error('Erro ao processar renovação:', err);
      alert('Ocorreu um erro ao processar o pagamento. Tente novamente.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAdminEmail.trim()) {
      alert('Nome da Liga e Email do Administrador são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days initial
      await onSaveLeague({
        name: newName.trim(),
        responsibleAdminEmail: newAdminEmail.trim().toLowerCase(),
        responsibleAdminName: newAdminName.trim() || undefined,
        responsibleAdminPhone: newAdminPhone.trim() || undefined,
        monthlyFee: Number(newMonthlyFee) || 600,
        status: 'active',
        expiresAt,
        neighborhood: newNeighborhood.trim(),
        city: newCity.trim(),
        createdAt: Date.now()
      });

      setShowNewLeagueModal(false);
      setNewName('');
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminPhone('');
    } catch (err) {
      console.error('Erro ao cadastrar liga parceira:', err);
      alert('Falha ao registrar a liga comunitária.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit proof from regular user
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLeagueName.trim() || !userPhone.trim() || !userReference.trim()) {
      alert('Preencha o nome da liga, telefone e o código de referência da SMS.');
      return;
    }

    if (!onSubmitPaymentRequest) {
      alert('Função de submissão indisponível no momento.');
      return;
    }

    setIsSubmittingProof(true);
    try {
      await onSubmitPaymentRequest({
        leagueName: userLeagueName.trim(),
        phoneNumber: userPhone.trim(),
        paymentMethod: userMethod,
        reference: userReference.trim().toUpperCase(),
        notes: userNotes.trim() || undefined,
        leagueId: activeLeague?.id,
      });

      setProofSuccessMsg('Comprovativo de 600 MT enviado com sucesso! O Administrador Lázaro Atalia irá conferir e libertar o app para a sua liga.');
      setTimeout(() => {
        setShowSubmitProofModal(false);
        setProofSuccessMsg('');
        setUserReference('');
        setUserNotes('');
      }, 3000);
    } catch (err) {
      console.error('Erro ao submeter comprovativo:', err);
      setActionFeedbackMsg({ type: 'error', text: 'Erro ao enviar comprovativo. Tente novamente.' });
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Admin executes email liberation (1 month admin pass)
  const handleExecuteEmailLiberation = async (emailToLiberate: string, days: number = 30) => {
    if (!onLiberateUserByEmail) return;
    const cleanEmail = emailToLiberate.trim().toLowerCase();
    if (!cleanEmail) {
      setActionFeedbackMsg({ type: 'error', text: 'Insira um e-mail válido.' });
      return;
    }

    setIsLiberatingEmail(true);
    try {
      await onLiberateUserByEmail(cleanEmail, days);
      setLiberateSuccessMsg(`Sucesso! O utilizador ${cleanEmail} agora é Administrador de Liga durante 1 mês (${days} dias). Ele já pode postar notícias, criar clubes e organizar jogos!`);
      setActionFeedbackMsg({
        type: 'success',
        text: `Acesso liberado para ${cleanEmail} por 30 dias com sucesso!`
      });
      setInputLiberateEmail('');
      setTimeout(() => {
        setLiberateSuccessMsg('');
      }, 5000);
      setTimeout(() => {
        setActionFeedbackMsg(null);
      }, 5000);
    } catch (err) {
      console.error('Erro ao liberar usuário por e-mail:', err);
      setActionFeedbackMsg({ type: 'error', text: 'Ocorreu um erro ao liberar o utilizador. Tente novamente.' });
    } finally {
      setIsLiberatingEmail(false);
    }
  };

  // Admin executes suspension or immediate cancellation of user admin pass
  const handleExecuteUserSuspension = async (emailToSuspend: string, isImmediateCancel: boolean = false) => {
    if (!onSuspendUserAdminByEmail) return;
    const cleanEmail = emailToSuspend.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsProcessingAction(true);
    try {
      await onSuspendUserAdminByEmail(cleanEmail);
      setActionFeedbackMsg({
        type: 'success',
        text: isImmediateCancel 
          ? `Mensalidade de ${cleanEmail} cancelada de imediato com sucesso! O utilizador permanece cadastrado no aplicativo como membro comum, mas já não administra o app.`
          : `Acesso de administrador de ${cleanEmail} suspenso com sucesso.`
      });
      setTimeout(() => setActionFeedbackMsg(null), 6000);
    } catch (err) {
      console.error('Erro ao suspender/cancelar usuário:', err);
      setActionFeedbackMsg({ type: 'error', text: 'Ocorreu um erro ao suspender/cancelar o utilizador.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Admin confirms pending payment ticket
  const handleConfirmPayment = async (payment: LicensePayment) => {
    if (!onConfirmMonthlyPayment) return;
    setIsProcessingAction(true);
    try {
      await onConfirmMonthlyPayment(payment);
      setActionFeedbackMsg({
        type: 'success',
        text: `Mensalidade de 600 MT confirmada com sucesso! O app foi libertado para "${payment.leagueName}".`
      });
      setTimeout(() => setActionFeedbackMsg(null), 6000);
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      setActionFeedbackMsg({ type: 'error', text: 'Erro ao confirmar o pagamento.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Admin suspends/cancels league access immediately or at end of month
  const handleSuspendLeague = async (league: CommunityLeague, isImmediateCancel: boolean = false) => {
    if (!onCancelOrSuspendLeague) return;
    setIsProcessingAction(true);
    try {
      const reason = isImmediateCancel
        ? 'Mensalidade cancelada pelo Administrador Master antes do fim do mês.'
        : 'Fim do mês - Aguardando renovação da mensalidade (600 MT)';
      await onCancelOrSuspendLeague(league.id, reason);
      setActionFeedbackMsg({
        type: 'success',
        text: isImmediateCancel 
          ? `Mensalidade da liga "${league.name}" cancelada de imediato com sucesso!` 
          : `Acesso da liga "${league.name}" suspenso até à renovação da mensalidade.`
      });
      setTimeout(() => setActionFeedbackMsg(null), 6000);
    } catch (err) {
      console.error('Erro ao suspender/cancelar liga:', err);
      setActionFeedbackMsg({ type: 'error', text: 'Erro ao suspender o acesso da liga.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Admin executes rejection
  const handleExecuteReject = async () => {
    if (!rejectingPayment || !onRejectPayment) return;
    setIsProcessingAction(true);
    try {
      await onRejectPayment(rejectingPayment.id, rejectReason.trim() || 'Comprovativo não identificado ou valor não recebido.');
      setRejectingPayment(null);
      setRejectReason('');
      setActionFeedbackMsg({ type: 'success', text: 'Pedido de mensalidade recusado com sucesso.' });
      setTimeout(() => setActionFeedbackMsg(null), 5000);
    } catch (err) {
      console.error('Erro ao rejeitar pagamento:', err);
      setActionFeedbackMsg({ type: 'error', text: 'Erro ao rejeitar o pedido.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Action Notification Banner */}
      {actionFeedbackMsg && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 border shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
          actionFeedbackMsg.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">
              {actionFeedbackMsg.type === 'success' ? '✅' : '⚠️'}
            </span>
            <span className="text-xs font-bold leading-tight">
              {actionFeedbackMsg.text}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedbackMsg(null)}
            className="text-xs font-bold px-2 py-1 rounded-lg bg-black/30 hover:bg-black/50 transition-colors shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 100% FREE VIP ADMINISTRATOR MASTER BANNER */}
      {isSuperAdmin && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-2xl border border-amber-300/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black/30 border border-amber-300/50 flex items-center justify-center shrink-0 shadow-inner text-amber-300">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-neutral-950 font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                    PAINEL MASTER DO ADMINISTRADOR
                  </span>
                  <span className="text-xs text-amber-100 font-bold">
                    {currentUser?.email}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white mt-1">
                  Todas as Funcionalidades São 100% Grátis para Si!
                </h2>
                <p className="text-xs text-amber-100/90 max-w-2xl mt-0.5">
                  Como administrador principal, você nunca paga mensalidade (600 MT) nem bilhetes de live (20 MT). Pode criar partidas, clubes e jogadores com total liberdade, além de liberar o app por e-mail para quem pagar e suspender quando o mês terminar.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowNewLeagueModal(true)}
                className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-900 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all border border-amber-300/40 shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Registar Liga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN FEATURE: LIBERATE USER APP ACCESS BY EMAIL (1 MONTH PASS) */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  Liberar Funcionalidade por E-mail (Mensalidade 1 Mês)
                </h2>
                <p className="text-xs text-neutral-400">
                  Quando alguém lhe mandar o dinheiro da mensalidade (600 MT), insira ou clique no e-mail com que ele se cadastrou no app para torná-lo Administrador durante 1 mês.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold px-3 py-1 rounded-full uppercase self-start sm:self-auto">
              {allUsers.length} Utilizadores Cadastrados
            </span>
          </div>

          {/* Quick Input By Email */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteEmailLiberation(inputLiberateEmail, 30);
            }} 
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                placeholder="Insira o e-mail do utilizador cadastrado (ex: cliente@gmail.com)"
                value={inputLiberateEmail}
                onChange={(e) => setInputLiberateEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLiberatingEmail || !inputLiberateEmail.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isLiberatingEmail ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Liberando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Liberar como Administrador (1 Mês)
                </>
              )}
            </button>
          </form>

          {/* Feedback message */}
          {liberateSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{liberateSuccessMsg}</span>
            </div>
          )}

          {/* Registered Users Directory & Instant 1-Click Liberation */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black text-neutral-300 uppercase tracking-wider">
                  Clique no E-mail para Liberar ou Suspender Acesso
                </h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setUserFilterRole('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    userFilterRole === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Todos ({allUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterRole('admins')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    userFilterRole === 'admins' ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Admins Ativos
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterRole('regular')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    userFilterRole === 'regular' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Não Admins
                </button>
              </div>
            </div>

            {/* User Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Pesquisar utilizador por nome ou e-mail..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Users List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="col-span-2 p-6 text-center text-xs text-neutral-500 bg-neutral-950 rounded-xl border border-neutral-800">
                  Nenhum utilizador encontrado com este termo.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isMaster = u.email === 'lazaroatalia80@gmail.com' || u.email === 'lazaratala80@gmail.com';
                  const isMonthlyActive = u.subscriptionExpiresAt && u.subscriptionExpiresAt > Date.now();
                  const isExpired = u.subscriptionExpiresAt && u.subscriptionExpiresAt <= Date.now();
                  const isAdminRole = u.role === 'admin' || isMonthlyActive;
                  const daysLeft = u.subscriptionExpiresAt ? calculateDaysRemaining(u.subscriptionExpiresAt) : 0;

                  return (
                    <div
                      key={u.uid}
                      className="p-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs truncate">
                            {u.displayName || 'Utilizador'}
                          </span>
                          {isMaster ? (
                            <span className="bg-amber-400 text-neutral-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                              👑 Master
                            </span>
                          ) : isMonthlyActive ? (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                              🟢 Admin (Restam {daysLeft}d)
                            </span>
                          ) : isExpired ? (
                            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                              🔴 Mensalidade Cancelada (Utilizador Comum)
                            </span>
                          ) : (
                            <span className="bg-neutral-800 text-neutral-400 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0">
                              ⚪ Utilizador Cadastrado (Normal)
                            </span>
                          )}
                          {u.canPostContent && (
                            <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                              ✍️ Pode Postar
                            </span>
                          )}
                        </div>

                        <div 
                          onClick={() => setInputLiberateEmail(u.email)}
                          className="font-mono text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer truncate flex items-center gap-1 mt-0.5"
                          title="Clique para colar este e-mail no campo de liberação"
                        >
                          <Mail size={12} className="text-neutral-500 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>

                        {isMonthlyActive && u.subscriptionExpiresAt && (
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            Expira em: {new Date(u.subscriptionExpiresAt).toLocaleDateString('pt-MZ')}
                          </div>
                        )}
                      </div>

                      {/* Admin Quick Action Button on each user */}
                      {!isMaster && (
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          {/* Toggle Posting Permission (Autorizar / Revogar Postagens) */}
                          {onToggleUserPostPermission && (
                            <button
                              type="button"
                              onClick={() => onToggleUserPostPermission(u.uid, !u.canPostContent)}
                              className={`px-2 py-1 border text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                u.canPostContent
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-neutral-900 hover:bg-neutral-800 text-sky-400 border-sky-500/30'
                              }`}
                              title={u.canPostContent ? "Revogar permissão de postar partidas/anúncios" : "Autorizar este membro a criar partidas e anúncios no app"}
                            >
                              <span>{u.canPostContent ? 'Revogar Post' : '✍️ Autorizar Post'}</span>
                            </button>
                          )}

                          {isMonthlyActive ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleExecuteEmailLiberation(u.email, 30)}
                                disabled={isProcessingAction}
                                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                title="Renovar por mais 30 dias"
                              >
                                +30 Dias
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExecuteUserSuspension(u.email, true)}
                                disabled={isProcessingAction}
                                className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Cancelar a mensalidade imediatamente (mesmo não tendo chegado o fim do mês)"
                              >
                                <XCircle size={11} className="text-rose-400" />
                                <span>Cancelar Já</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExecuteUserSuspension(u.email, false)}
                                disabled={isProcessingAction}
                                className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Suspender no fim do mês"
                              >
                                <Lock size={11} />
                                <span>Fim do Mês</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleExecuteEmailLiberation(u.email, 30)}
                              disabled={isProcessingAction}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Zap size={11} />
                              <span>Liberar 1 Mês</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/40 via-neutral-900 to-neutral-950 border border-emerald-500/20 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              SISTEMA DE MENSALIDADE E LICENÇAS BE-LWEZER (600 MT/MÊS)
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
              Gestão de Ligas & Acesso ao App
            </h1>
            <p className="text-neutral-400 text-sm max-w-2xl">
              Mensalidade de <strong>600 MT</strong> para liberar o aplicativo para que a sua comunidade possa gerir campeonatos e postar notícias sobre a sua liga. Pagamentos oficiais via <strong>M-Pesa (85 619 79 09)</strong> e <strong>e-Mola (87 88 030 93)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setUserLeagueName(activeLeague?.name || '');
                setShowSubmitProofModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Submeter Comprovativo (600 MT)
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => setShowNewLeagueModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nova Comunidade
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Official Payment Accounts Info Box */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Contas Oficiais para Pagamento da Mensalidade (600 MT)
            </h3>
          </div>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 rounded-full">
            Titular: Lázaro Atalia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* e-Mola */}
          <div className="bg-neutral-950 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                e-Mola (Movitel) · Mensalidade 600 MT
              </div>
              <div className="font-mono font-black text-white text-base">
                87 88 030 93
              </div>
              <div className="text-[11px] text-neutral-400">
                Nome: <strong className="text-neutral-200">Lázaro Atalia</strong>
              </div>
            </div>
            <button
              onClick={() => handleCopyPhone('878803093')}
              className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              {copiedPhone === '878803093' ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* M-Pesa */}
          <div className="bg-neutral-950 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                M-Pesa (Vodacom) · Mensalidade 600 MT
              </div>
              <div className="font-mono font-black text-white text-base">
                85 619 79 09
              </div>
              <div className="text-[11px] text-neutral-400">
                Nome: <strong className="text-neutral-200">Lázaro Atalia</strong>
              </div>
            </div>
            <button
              onClick={() => handleCopyPhone('856197909')}
              className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              {copiedPhone === '856197909' ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ADMIN CONTROL CENTER: PENDING MONTHLY PAYMENTS (600 MT) */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Validação de Mensalidades Recebidas (600 MT)
                  {pendingPayments.length > 0 && (
                    <span className="bg-amber-500 text-neutral-950 text-xs px-2 py-0.5 rounded-full font-black animate-pulse">
                      {pendingPayments.length} PENDENTE{pendingPayments.length > 1 ? 'S' : ''}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-neutral-400">
                  Quando o cliente enviar os 600 MT via M-Pesa ou e-Mola, confirme aqui para libertar o app para a sua comunidade.
                </p>
              </div>
            </div>
          </div>

          {pendingPayments.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-neutral-950/60 border border-neutral-800 text-neutral-500 text-xs">
              <CheckCircle className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              Nenhum pedido de validação de mensalidade pendente no momento. Todas as contas estão regulares.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPayments.map((p) => (
                <div 
                  key={p.id}
                  className="p-4 rounded-xl bg-neutral-950 border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-base">
                        {p.leagueName || 'Liga Comunitária'}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        p.paymentMethod === 'mpesa' 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {p.paymentMethod === 'mpesa' ? 'M-Pesa (Vodacom)' : 'e-Mola (Movitel)'}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black px-2.5 py-0.5 rounded">
                        {p.amount || 600} MT
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-neutral-400">
                      <div>
                        📱 Telemóvel: <strong className="text-white font-mono">{p.phoneNumber}</strong>
                      </div>
                      <div>
                        🔑 Ref. SMS: <strong className="text-amber-300 font-mono">{p.reference}</strong>
                      </div>
                      <div>
                        👤 Solicitante: <strong className="text-neutral-200">{p.userName || p.userEmail || 'Organizador'}</strong>
                      </div>
                    </div>

                    {p.notes && (
                      <p className="text-xs text-neutral-400 italic">
                        Nota: "{p.notes}"
                      </p>
                    )}
                    <div className="text-[10px] text-neutral-500">
                      Enviado em: {new Date(p.paidAt).toLocaleString('pt-MZ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleConfirmPayment(p)}
                      disabled={isProcessingAction}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirmar Mensalidade & Liberar
                    </button>

                    <button
                      onClick={() => {
                        setRejectingPayment(p);
                        setRejectReason('');
                      }}
                      disabled={isProcessingAction}
                      className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs uppercase transition-all cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Leagues List & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Community Selector & Search */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Ligas Cadastradas ({communityLeagues.length})
              </h2>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar comunidade ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {communityLeagues.length === 0 ? (
              <div className="p-6 text-center text-neutral-500 text-xs">
                Nenhuma comunidade parceira cadastrada ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredLeagues.map((league) => {
                  const isSelected = league.id === selectedLeagueId;
                  const isPast = Date.now() > league.expiresAt;
                  const isExpired = league.status === 'expired' || isPast;

                  return (
                    <div
                      key={league.id}
                      onClick={() => setSelectedLeagueId(league.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-neutral-800/80 border-emerald-500/60 shadow-lg'
                          : 'bg-neutral-950/60 border-neutral-800/60 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            {league.name}
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-neutral-500" />
                            {league.responsibleAdminEmail}
                          </div>
                          {league.neighborhood && (
                            <div className="text-[10px] text-neutral-500 mt-0.5">
                              📍 {league.neighborhood}
                            </div>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isExpired 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {isExpired ? 'Expirada' : 'Ativa'}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono mt-1">
                            {league.monthlyFee || 600} MT/mês
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Selected Community Details & Control */}
        <div className="lg:col-span-2 space-y-6">
          {activeLeague ? (
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Header Status Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {activeLeague.name}
                    </h3>
                    {getStatusBadge(activeLeague.status, activeLeague.expiresAt)}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {activeLeague.neighborhood ? `${activeLeague.neighborhood}, ` : ''}{activeLeague.city || 'Moçambique'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenRenewal(activeLeague)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Renovar (+30 Dias)
                  </button>

                  {/* ADMIN CANCEL / SUSPEND AT END OF MONTH OR IMMEDIATELY */}
                  {isSuperAdmin && (
                    <>
                      {activeLeague.status === 'active' && Date.now() <= activeLeague.expiresAt ? (
                        <>
                          <button
                            onClick={() => handleSuspendLeague(activeLeague, true)}
                            disabled={isProcessingAction}
                            title="Cancelar a mensalidade imediatamente mesmo não tendo chegado o fim do mês"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                          >
                            <XCircle className="w-4 h-4 text-rose-400" />
                            Cancelar Imediatamente
                          </button>
                          <button
                            onClick={() => handleSuspendLeague(activeLeague, false)}
                            disabled={isProcessingAction}
                            title="Suspender acesso no fim do mês até renovação"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <Lock className="w-4 h-4" />
                            Suspender (Fim do Mês)
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onToggleLeagueStatus(activeLeague.id, 'active')}
                          disabled={isProcessingAction}
                          title="Reativar e libertar acesso da liga"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Unlock className="w-4 h-4" />
                          Liberar App
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Status Warning if Expired */}
              {(activeLeague.status === 'expired' || Date.now() > activeLeague.expiresAt) && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-rose-300">
                      ACESSO BLOQUEADO TEMPORARIAMENTE (MENSALIDADE PENDENTE)
                    </p>
                    <p className="text-neutral-300">
                      O período mensal desta liga terminou. O acesso a publicar notícias e gerir partidas está suspenso até à confirmação da renovação da mensalidade (600 MT) via M-Pesa (85 619 79 09) ou e-Mola (87 88 030 93).
                    </p>
                  </div>
                </div>
              )}

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                    <span>Validade da Licença</span>
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-base font-bold text-white">
                    {new Date(activeLeague.expiresAt).toLocaleDateString('pt-MZ', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    {calculateDaysRemaining(activeLeague.expiresAt) > 0 ? (
                      <span className="text-emerald-400 font-bold">
                        Restam {calculateDaysRemaining(activeLeague.expiresAt)} dias
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">
                        Expirada há {Math.abs(calculateDaysRemaining(activeLeague.expiresAt))} dias
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                    <span>Mensalidade</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    {activeLeague.monthlyFee || 600} <span className="text-xs text-neutral-400 font-normal">MT / mês</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    M-Pesa ou e-Mola
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                    <span>Administrador Responsável</span>
                    <Mail className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-sm font-bold text-white truncate" title={activeLeague.responsibleAdminEmail}>
                    {activeLeague.responsibleAdminName || activeLeague.responsibleAdminEmail}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1 truncate">
                    {activeLeague.responsibleAdminPhone || activeLeague.responsibleAdminEmail}
                  </div>
                </div>
              </div>

              {/* Payment History Table for this League */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Histórico de Mensalidades da Liga
                  </h4>
                  <span className="text-[11px] text-neutral-500">
                    Transações confirmadas
                  </span>
                </div>

                {licensePayments.filter(p => p.leagueId === activeLeague.id).length === 0 ? (
                  <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-6 text-center text-xs text-neutral-500">
                    Nenhum registo de pagamento registrado ainda para esta liga.
                  </div>
                ) : (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-900/60 text-neutral-400 border-b border-neutral-800 font-mono text-[10px] uppercase">
                          <tr>
                            <th className="py-2.5 px-4">Data</th>
                            <th className="py-2.5 px-4">Método</th>
                            <th className="py-2.5 px-4">Referência</th>
                            <th className="py-2.5 px-4">Valor</th>
                            <th className="py-2.5 px-4">Válido Até</th>
                            <th className="py-2.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900 text-neutral-300">
                          {licensePayments
                            .filter(p => p.leagueId === activeLeague.id)
                            .sort((a, b) => b.paidAt - a.paidAt)
                            .map((payment) => (
                              <tr key={payment.id} className="hover:bg-neutral-900/30 transition-colors">
                                <td className="py-2.5 px-4 font-mono text-neutral-400">
                                  {new Date(payment.paidAt).toLocaleDateString('pt-MZ')}
                                </td>
                                <td className="py-2.5 px-4 font-bold">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono ${
                                    payment.paymentMethod === 'mpesa' 
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    {payment.paymentMethod === 'mpesa' ? 'M-Pesa (Vodacom)' : 'e-Mola (Movitel)'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-400">
                                  {payment.reference}
                                </td>
                                <td className="py-2.5 px-4 font-black text-white">
                                  {payment.amount || 600} MT
                                </td>
                                <td className="py-2.5 px-4 font-mono text-neutral-400">
                                  {new Date(payment.validUntil).toLocaleDateString('pt-MZ')}
                                </td>
                                <td className="py-2.5 px-4">
                                  {payment.status === 'completed' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                                      <CheckCircle className="w-3.5 h-3.5" /> Confirmado
                                    </span>
                                  ) : payment.status === 'pending' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                                      <Clock className="w-3.5 h-3.5" /> Pendente
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-bold">
                                      <XCircle className="w-3.5 h-3.5" /> Rejeitado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">
              Selecione uma comunidade à esquerda para visualizar e gerir o licenciamento.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Submit Monthly Payment Proof (For users to unlock league posting) */}
      {showSubmitProofModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Submeter Comprovativo de Mensalidade
                </h3>
              </div>
              <button
                onClick={() => setShowSubmitProofModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {proofSuccessMsg ? (
              <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold leading-relaxed">{proofSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1 text-amber-300">
                    <DollarSign size={14} /> Valor da Mensalidade: 600 Meticais
                  </p>
                  <p>
                    Transfira o valor para um dos números oficiais de <strong>Lázaro Atalia</strong> e insira o código da mensagem SMS de confirmação abaixo.
                  </p>
                </div>

                {/* Number selector copy cards */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div 
                    onClick={() => setUserMethod('emola')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      userMethod === 'emola' 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-200 ring-1 ring-amber-500' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="font-black text-amber-400 text-xs">e-Mola (Movitel)</div>
                    <div className="font-mono font-black text-white text-sm">87 88 030 93</div>
                    <div className="text-[10px] text-neutral-400">Lázaro Atalia</div>
                  </div>

                  <div 
                    onClick={() => setUserMethod('mpesa')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      userMethod === 'mpesa' 
                        ? 'bg-rose-500/10 border-rose-500 text-rose-200 ring-1 ring-rose-500' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="font-black text-rose-400 text-xs">M-Pesa (Vodacom)</div>
                    <div className="font-mono font-black text-white text-sm">85 619 79 09</div>
                    <div className="text-[10px] text-neutral-400">Lázaro Atalia</div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Nome da Sua Liga ou Campeonato
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Torneio Inter-Bairros Chamanculo"
                    value={userLeagueName}
                    onChange={(e) => setUserLeagueName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    O Seu Telemóvel que Enviou o Pagamento
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 84 123 4567 ou 86 123 4567"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Código de Referência da SMS ({userMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola'})
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 7AK492BZ ou PP2409..."
                    value={userReference}
                    onChange={(e) => setUserReference(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Copie a referência da mensagem de confirmação que recebeu no seu telefone.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Notas ou Comentários (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais para o administrador..."
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowSubmitProofModal(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProof}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    {isSubmittingProof ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        A Enviar...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Comprovativo
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Admin Reject Payment */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-rose-400 uppercase tracking-tight flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Recusar Pedido de Mensalidade
            </h3>
            <p className="text-xs text-neutral-400">
              Indique o motivo pelo qual o comprovativo da liga <strong>"{rejectingPayment.leagueName}"</strong> não pôde ser validado:
            </p>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                Motivo da Recusa
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Valor não recebido na conta ou código de SMS inválido."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleExecuteReject}
                disabled={isProcessingAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New League Registration */}
      {showNewLeagueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-emerald-400" />
              Registar Comunidade Parceira
            </h3>

            <form onSubmit={handleCreateLeague} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                  Nome da Liga / Campeonato
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torneio Craques de Chamanculo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Email do Administrador
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@comunidade.co.mz"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Sitoe"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Contacto Telefónico
                  </label>
                  <input
                    type="tel"
                    placeholder="84xxxxxxx ou 86xxxxxxx"
                    value={newAdminPhone}
                    onChange={(e) => setNewAdminPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Mensalidade da Licença (MZN)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={newMonthlyFee}
                    onChange={(e) => setNewMonthlyFee(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={newNeighborhood}
                    onChange={(e) => setNewNeighborhood(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase mb-1">
                    Cidade / Província
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowNewLeagueModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'A registar...' : 'Salvar Comunidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Renewal & Mobile Money Payment */}
      {showRenewalModal && leagueToRenew && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-2 text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Renovação de Licença Mensal
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Comunidade: <strong className="text-white">{leagueToRenew.name}</strong>
              </p>
            </div>

            {paymentSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold leading-relaxed">{paymentSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleProcessRenewal} className="space-y-4">
                {/* Mobile Money Selector */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">
                    Escolha o Método de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRenewMethod('mpesa')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        renewMethod === 'mpesa'
                          ? 'bg-rose-500/10 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-black text-sm">M-Pesa</div>
                      <div className="text-[10px] text-neutral-400">Vodacom (84/85)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRenewMethod('emola')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        renewMethod === 'emola'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-black text-sm">e-Mola</div>
                      <div className="text-[10px] text-neutral-400">Movitel (86/87)</div>
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">
                    Duração da Renovação
                  </label>
                  <select
                    value={renewMonths}
                    onChange={(e) => setRenewMonths(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>1 Mês (30 dias) - {leagueToRenew.monthlyFee || 600} MT</option>
                    <option value={3}>3 Meses (Trimestral) - {(leagueToRenew.monthlyFee || 600) * 3} MT</option>
                    <option value={6}>6 Meses (Semestral) - {(leagueToRenew.monthlyFee || 600) * 6} MT</option>
                    <option value={12}>12 Meses (Anual) - {(leagueToRenew.monthlyFee || 600) * 12} MT</option>
                  </select>
                </div>

                {/* Official Destination Numbers */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                      Número Oficial para Pagamento
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Titular: Lázaro Atalia
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* e-Mola */}
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      renewMethod === 'emola' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-neutral-900 border-neutral-800'
                    }`}>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-amber-400">e-Mola (Movitel)</div>
                        <div className="font-mono font-black text-white text-sm">87 88 030 93</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone('878803093')}
                        className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                        title="Copiar número"
                      >
                        {copiedPhone === '878803093' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>

                    {/* M-Pesa */}
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      renewMethod === 'mpesa' ? 'bg-rose-500/10 border-rose-500/50' : 'bg-neutral-900 border-neutral-800'
                    }`}>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-rose-400">M-Pesa (Vodacom)</div>
                        <div className="font-mono font-black text-white text-sm">85 619 79 09</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone('856197909')}
                        className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                        title="Copiar número"
                      >
                        {copiedPhone === '856197909' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phone Number Input */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">
                    O Seu Telemóvel de Pagamento ({renewMethod === 'mpesa' ? 'Vodacom' : 'Movitel'})
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={renewMethod === 'mpesa' ? 'Ex: 84 123 4567' : 'Ex: 86 123 4567'}
                    value={renewPhone}
                    onChange={(e) => setRenewPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Irá receber um prompt USSD no seu telemóvel para confirmar o PIN do {renewMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola'}.
                  </p>
                </div>

                {/* Total Summary */}
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Total a pagar:</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {(leagueToRenew.monthlyFee || 600) * renewMonths} MT
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRenewalModal(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Validando Pagamento...
                      </>
                    ) : (
                      'Pagar e Ativar Licença'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
