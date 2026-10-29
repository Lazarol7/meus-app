import React, { useState } from 'react';
import { Match, UserProfile, LiveTicket } from '../types';
import { Language } from '../constants';
import { 
  Video, Users, DollarSign, X, Radio, ChevronRight, 
  Shield, Clock, Sparkles, CheckCircle2, Trophy, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveMatchesHubModalProps {
  isOpen: boolean;
  matches: Match[];
  currentUser: UserProfile | null;
  tickets?: LiveTicket[];
  lang: Language;
  onClose: () => void;
  onSelectLiveMatch: (matchId: string) => void;
}

export const LiveMatchesHubModal: React.FC<LiveMatchesHubModalProps> = ({
  isOpen,
  matches,
  currentUser,
  tickets = [],
  lang,
  onClose,
  onSelectLiveMatch,
}) => {
  const [filterLeague, setFilterLeague] = useState<string>('all');

  if (!isOpen) return null;

  // Filter all matches that are currently broadcasting live
  const liveMatches = matches.filter(m => m.liveStream?.isLive);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'lazaroatalia80@gmail.com';

  // Get distinct leagues
  const leagues = Array.from(new Set(liveMatches.map(m => m.league).filter(Boolean))) as string[];

  const filteredLives = filterLeague === 'all' 
    ? liveMatches 
    : liveMatches.filter(m => m.league === filterLeague);

  const hasPurchasedTicket = (matchId: string) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return tickets.some(t => t.matchId === matchId && t.userId === currentUser.uid);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-rose-950 via-neutral-900 to-neutral-950 border-b border-rose-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner">
                <Video className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                    <Radio className="w-3 h-3 animate-ping" />
                    Central de Jogos Ao Vivo
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    {liveMatches.length} {liveMatches.length === 1 ? 'partida em direto' : 'partidas em direto'}
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight mt-0.5">
                  Escolha o Jogo que Deseja Assistir
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Subtitle & League Filter */}
          <div className="px-6 py-3 bg-neutral-950/80 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="text-neutral-400">
              Várias partidas a serem filmadas em simultâneo nos campos do bairro. Selecione para entrar na transmissão.
            </p>

            {leagues.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <button
                  onClick={() => setFilterLeague('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterLeague === 'all'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Todas ({liveMatches.length})
                </button>
                {leagues.map(l => (
                  <button
                    key={l}
                    onClick={() => setFilterLeague(l)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterLeague === l
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    🏆 {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Matches Grid */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {liveMatches.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-neutral-800 flex items-center justify-center text-neutral-500 mx-auto">
                  <Video className="w-8 h-8 opacity-40" />
                </div>
                <h3 className="font-bold text-white text-base">
                  Nenhuma partida a ser filmada no momento
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Assim que um administrador ou organizador clicar em "Iniciar Live" num campo de jogo, a transmissão aparecerá aqui para todos escolherem.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLives.map((match) => {
                  const isFree = !match.liveStream?.price || match.liveStream.price === 0;
                  const isOwnerOrAdmin = isAdmin || match.organizerId === currentUser?.uid || match.liveStream?.broadcasterId === currentUser?.uid;
                  const hasUnlocked = isOwnerOrAdmin || hasPurchasedTicket(match.id);
                  const currentMinute = match.timer?.currentMinute || 0;

                  return (
                    <div
                      key={match.id}
                      onClick={() => {
                        onSelectLiveMatch(match.id);
                        onClose();
                      }}
                      className="group bg-neutral-950 border border-neutral-800 hover:border-rose-500/60 rounded-3xl p-5 transition-all shadow-lg hover:shadow-rose-950/20 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Live Badge & Viewers */}
                      <div className="flex items-center justify-between text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            EM DIRETO
                          </span>
                          <span className="text-neutral-400 font-mono text-[11px]">
                            {currentMinute > 0 ? `${currentMinute}'` : 'Ao Vivo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-neutral-300 font-mono text-xs bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-800">
                          <Users size={12} className="text-rose-400" />
                          <span>{match.liveStream?.viewerCount || 0} a assistir</span>
                        </div>
                      </div>

                      {/* Teams & Scoreboard */}
                      <div className="py-3 flex items-center justify-between gap-3 border-y border-neutral-900 my-1">
                        {/* Team A */}
                        <div className="flex-1 text-center space-y-1">
                          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto overflow-hidden shadow-inner">
                            {match.teamALogoURL ? (
                              <img src={match.teamALogoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Shield className="w-6 h-6 text-emerald-400" />
                            )}
                          </div>
                          <p className="text-xs font-black text-white truncate px-1">
                            {match.teamAName || 'Equipa A'}
                          </p>
                        </div>

                        {/* Live Score */}
                        <div className="text-center px-3 py-1.5 bg-neutral-900 rounded-2xl border border-neutral-800">
                          <div className="text-xl md:text-2xl font-black text-white font-mono tracking-wider">
                            {match.scoreA ?? 0} : {match.scoreB ?? 0}
                          </div>
                          <span className="text-[9px] uppercase font-bold text-rose-400 tracking-widest">
                            TEMPO REAL
                          </span>
                        </div>

                        {/* Team B */}
                        <div className="flex-1 text-center space-y-1">
                          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto overflow-hidden shadow-inner">
                            {match.teamBLogoURL ? (
                              <img src={match.teamBLogoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Shield className="w-6 h-6 text-blue-400" />
                            )}
                          </div>
                          <p className="text-xs font-black text-white truncate px-1">
                            {match.teamBName || 'Equipa B'}
                          </p>
                        </div>
                      </div>

                      {/* Meta: Broadcaster & Price */}
                      <div className="pt-3 flex items-center justify-between text-xs mt-2">
                        <div className="text-neutral-400 truncate max-w-[150px]">
                          <span className="text-[10px] block text-neutral-500 uppercase font-mono">Filmado por</span>
                          <span className="font-bold text-neutral-300 truncate">
                            {match.liveStream?.broadcasterName || 'Administrador'}
                          </span>
                        </div>

                        {/* Status / Ticket Info */}
                        <div className="text-right">
                          {hasUnlocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                              <CheckCircle2 size={12} />
                              Acesso Liberado
                            </span>
                          ) : isFree ? (
                            <span className="inline-flex items-center text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                              Gratuito
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl font-mono">
                              <DollarSign size={12} />
                              {match.liveStream?.price} MZN
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        className="mt-4 w-full py-2.5 bg-rose-600 group-hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-950/40"
                      >
                        <Video size={14} />
                        <span>Assistir Esta Partida</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-center text-[11px] text-neutral-400">
            {isAdmin ? (
              <span className="text-emerald-400 font-bold">
                ✓ Modo Administrador Ativo: Acesso livre a todas as transmissões ao vivo.
              </span>
            ) : (
              <span>
                Transmissões em direto filmadas pelas equipas e comunidades do bairro. Pagamentos via M-Pesa / e-Mola revertem para a organização do torneio.
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
