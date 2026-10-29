import React, { useState } from 'react';
import { Complaint, ComplaintCategory, ComplaintStatus, UserProfile } from '../types';
import { Language } from '../constants';
import { 
  MessageSquareWarning, Send, CheckCircle2, Clock, AlertTriangle, 
  HelpCircle, User, Phone, Mail, Shield, Filter, Search, Check, X,
  ChevronDown, ChevronUp, Reply, Sparkles, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface ComplaintsCenterProps {
  currentUser: UserProfile | null;
  complaints: Complaint[];
  lang: Language;
  onSubmitComplaint: (data: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'userId' | 'userName' | 'userEmail'>) => Promise<void>;
  onRespondComplaint: (complaintId: string, responseText: string) => Promise<void>;
  onResolveComplaint?: (complaintId: string) => Promise<void>;
}

export function ComplaintsCenter({
  currentUser,
  complaints,
  lang,
  onSubmitComplaint,
  onRespondComplaint,
  onResolveComplaint,
}: ComplaintsCenterProps) {
  const isAdmin = currentUser?.role === 'admin' || 
    currentUser?.email === 'lazaroatalia80@gmail.com' ||
    currentUser?.email === 'lazaratala80@gmail.com';

  // New complaint form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('league');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Admin response modal / inline state
  const [respondingTo, setRespondingTo] = useState<Complaint | null>(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [isSendingResponse, setIsSendingResponse] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'answered'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories: { key: ComplaintCategory; label: string; icon: string }[] = [
    { key: 'league', label: 'Liga / Campeonato', icon: '🏆' },
    { key: 'match', label: 'Partida / Resultado', icon: '⚽' },
    { key: 'subscription', label: 'Mensalidade (600 MT) / Pagamento', icon: '💳' },
    { key: 'club', label: 'Clube / Jogadores', icon: '🛡️' },
    { key: 'referee', label: 'Arbitragem / Disciplinar', icon: '🟨' },
    { key: 'technical', label: 'Problema Técnico / Live', icon: '📱' },
    { key: 'other', label: 'Outro Assunto', icon: '📝' },
  ];

  // User's own complaints vs All complaints for admin
  const visibleComplaints = isAdmin 
    ? complaints 
    : complaints.filter(c => c.userId === currentUser?.uid);

  const filteredComplaints = visibleComplaints.filter(c => {
    if (filterStatus === 'pending' && c.status !== 'pending') return false;
    if (filterStatus === 'answered' && c.status === 'pending') return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchMsg = c.message.toLowerCase().includes(q);
      const matchUser = c.userName?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchUser) return false;
    }
    return true;
  });

  const pendingCount = complaints.filter(c => c.status === 'pending').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitComplaint({
        title: title.trim(),
        message: message.trim(),
        category,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      setSubmitSuccess(true);
      setTitle('');
      setMessage('');
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowNewForm(false);
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar reclamação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResponse = async () => {
    if (!respondingTo || !adminResponseText.trim()) return;

    setIsSendingResponse(true);
    try {
      await onRespondComplaint(respondingTo.id, adminResponseText.trim());
      setRespondingTo(null);
      setAdminResponseText('');
      alert('Resposta enviada com sucesso ao utilizador!');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar resposta.');
    } finally {
      setIsSendingResponse(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <MessageSquareWarning size={14} className="text-amber-400" />
              <span>Ouvidoria & Suporte Be-Lwezer</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Central de Reclamações & Sugestões
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Tem alguma reclamação sobre a sua liga, partidas, clubes ou sugestão de melhoria? Escreva aqui abaixo. Todas as mensagens são lidas e respondidas pessoalmente pelo Administrador Master (<strong>Lázaro Atalia</strong>).
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!isAdmin && (
              <button
                type="button"
                onClick={() => setShowNewForm(!showNewForm)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <MessageSquareWarning size={16} />
                <span>{showNewForm ? 'Fechar Formulário' : 'Nova Reclamação'}</span>
              </button>
            )}
            {isAdmin && (
              <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs font-bold text-amber-300 flex items-center gap-2">
                <Shield size={16} className="text-amber-400" />
                <span>Painel Master: {pendingCount} por responder</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW COMPLAINT FORM (User) */}
      <AnimatePresence>
        {(showNewForm || (!isAdmin && visibleComplaints.length === 0)) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✍️</span>
                  <h3 className="font-black text-gray-900 text-base">
                    Escrever Reclamação ou Sugestão ao Administrador
                  </h3>
                </div>
                {showNewForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {submitSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-scale-up">
                  <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                  <h4 className="font-black text-emerald-900 text-base">Reclamação Enviada com Sucesso!</h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    O Administrador Lázaro Atalia foi notificado e irá responder em breve. Você poderá acompanhar a resposta diretamente aqui nesta página.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Categoria do Assunto *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {categories.map(c => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setCategory(c.key)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                            category === c.key
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          )}
                        >
                          <span>{c.icon}</span>
                          <span className="truncate">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Título / Assunto Principal *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ex: Erro no resultado do jogo de ontem..."
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        maxLength={150}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Telemóvel para Contacto (Opcional)
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="84 123 4567 ou 87 123 4567"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Descreva a sua Reclamação ou Sugestão *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Explique detalhadamente o que aconteceu, qual o clube ou partida envolvida, ou o que gostaria que o administrador corrigisse..."
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      maxLength={2500}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    {showNewForm && (
                      <button
                        type="button"
                        onClick={() => setShowNewForm(false)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting || !title.trim() || !message.trim()}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Send size={14} />
                      <span>{isSubmitting ? 'A Enviar...' : 'Enviar Reclamação'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer",
              filterStatus === 'all'
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-neutral-800 text-neutral-400 hover:text-white"
            )}
          >
            Todas ({visibleComplaints.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'pending'
                ? "bg-amber-500 text-neutral-950 font-black shadow-xs"
                : "bg-neutral-800 text-neutral-400 hover:text-white"
            )}
          >
            <Clock size={12} />
            <span>Pendentes ({visibleComplaints.filter(c => c.status === 'pending').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('answered')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'answered'
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-neutral-800 text-neutral-400 hover:text-white"
            )}
          >
            <CheckCircle2 size={12} />
            <span>Respondidas ({visibleComplaints.filter(c => c.status !== 'pending').length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por assunto ou mensagem..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* COMPLAINTS LIST */}
      <div className="space-y-4">
        {filteredComplaints.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-neutral-900/50 border border-neutral-800 text-neutral-400 space-y-2">
            <MessageSquareWarning size={32} className="text-neutral-600 mx-auto" />
            <h4 className="text-sm font-bold text-neutral-300">Nenhuma reclamação encontrada</h4>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {isAdmin 
                ? 'Nenhuma reclamação foi submetida com este filtro.' 
                : 'Você ainda não enviou nenhuma reclamação. Se tiver algum problema, clique no botão acima para nos informar.'}
            </p>
          </div>
        ) : (
          filteredComplaints.map(item => {
            const isAnswered = item.status === 'answered' || item.status === 'resolved';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-3xl p-5 sm:p-6 border transition-all space-y-4",
                  isAnswered 
                    ? "bg-neutral-900/90 border-emerald-500/30" 
                    : "bg-neutral-900/90 border-amber-500/30"
                )}
              >
                {/* Complaint Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full flex items-center gap-1",
                      isAnswered
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    )}>
                      {isAnswered ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      <span>{isAnswered ? 'Respondida pelo Administrador' : 'Aguardando Resposta'}</span>
                    </span>

                    {item.category && (
                      <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full font-bold">
                        {categories.find(c => c.key === item.category)?.label || item.category}
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-neutral-500">
                      {new Date(item.createdAt).toLocaleString('pt-MZ')}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="text-[11px] text-neutral-400 font-mono">
                      De: <strong className="text-white">{item.userName}</strong> ({item.userEmail})
                      {item.phoneNumber && ` · 📱 ${item.phoneNumber}`}
                    </div>
                  )}
                </div>

                {/* Complaint Content */}
                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {item.message}
                  </p>
                </div>

                {/* ADMIN RESPONSE BOX */}
                {item.adminResponse ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-neutral-950 border border-emerald-500/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-black">
                        <Shield size={14} />
                        <span>Resposta do Administrador Master (Lázaro Atalia):</span>
                      </div>
                      {item.respondedAt && (
                        <span className="text-[10px] font-mono text-neutral-500">
                          {new Date(item.respondedAt).toLocaleString('pt-MZ')}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-100 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {item.adminResponse}
                    </p>
                  </div>
                ) : (
                  !isAdmin && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                      <Clock size={14} className="shrink-0 text-amber-400" />
                      <span>O Administrador está a analisar esta reclamação e responderá em breve.</span>
                    </div>
                  )
                )}

                {/* ADMIN ACTION: RESPOND BUTTON */}
                {isAdmin && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setRespondingTo(item);
                        setAdminResponseText(item.adminResponse || '');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Reply size={14} />
                      <span>{item.adminResponse ? 'Editar Resposta' : 'Responder à Reclamação'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* ADMIN RESPONSE MODAL */}
      {respondingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Reply size={16} className="text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Responder à Reclamação
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRespondingTo(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Original Complaint Summary */}
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="font-bold text-white">{respondingTo.userName}</span>
                <span className="text-[10px] font-mono">{respondingTo.userEmail}</span>
              </div>
              <p className="font-bold text-neutral-200">{respondingTo.title}</p>
              <p className="text-neutral-400 italic line-clamp-3">"{respondingTo.message}"</p>
            </div>

            {/* Response Input */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-neutral-300 uppercase">
                A Sua Resposta Oficial (Como Administrador Master) *
              </label>
              <textarea
                rows={5}
                required
                value={adminResponseText}
                onChange={e => setAdminResponseText(e.target.value)}
                placeholder="Escreva a resposta e solução para o utilizador..."
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRespondingTo(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendResponse}
                disabled={isSendingResponse || !adminResponseText.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Send size={14} />
                <span>{isSendingResponse ? 'A Enviar...' : 'Enviar Resposta'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
