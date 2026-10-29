import React, { useState } from 'react';
import { Match, Registration } from '../types';
import { LANGUAGES, Language } from '../constants';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { MapPin, Calendar, Users, DollarSign, ChevronRight, Trash2, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatchCardProps {
  match: Match;
  registrations: Registration[];
  lang: Language;
  canDelete?: boolean;
  onDelete?: (matchId: string) => void;
  onClick: (matchId: string) => void;
}

export function MatchCard({ match, registrations, lang, canDelete, onDelete, onClick }: MatchCardProps) {
  const t = LANGUAGES[lang];
  const dateLocale = lang === 'pt' ? ptBR : enUS;
  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
  const isFull = confirmedCount >= match.maxPlayers;
  const isLive = match.status === 'in_progress' || match.timer?.status === 'running';

  const getMinuteDisplay = () => {
    if (!match.timer) return null;
    const mins = match.timer.currentMinute;
    const stoppage = match.timer.stoppageMinutes;
    if (mins >= 90 && stoppage > 0) return `90'+${stoppage}'`;
    if (mins >= 45 && match.timer.half === 1 && stoppage > 0) return `45'+${stoppage}'`;
    return `${mins}'`;
  };

  return (
    <div
      onClick={() => onClick(match.id)}
      className="group relative bg-white rounded-3xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isLive ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white animate-pulse uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                AO VIVO {getMinuteDisplay()}
              </span>
            ) : (
              <span className="text-xs font-mono text-emerald-600 uppercase tracking-wider">
                {match.status === 'open' ? t.automaticCall : 
                 match.status === 'finished' ? 'Finalizada' :
                 match.status === 'cancelled' ? t.matchCancelled : t.matchFull}
              </span>
            )}

            {match.league && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                🏆 {match.league}
              </span>
            )}
          </div>

          <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
            {format(match.date, "EEEE, d 'de' MMMM", { locale: dateLocale })}
          </h3>

          {(match.teamAName || match.teamBName) && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1.5">
              {match.teamALogoURL && (
                <img src={match.teamALogoURL} alt="" className="w-4 h-4 rounded-md object-cover shrink-0" />
              )}
              <span>{match.teamAName || t.teamA}</span>
              <span className="text-gray-400 font-normal lowercase px-0.5">vs</span>
              {match.teamBLogoURL && (
                <img src={match.teamBLogoURL} alt="" className="w-4 h-4 rounded-md object-cover shrink-0" />
              )}
              <span>{match.teamBName || t.teamB}</span>

              {/* Score if finished or in progress */}
              {(match.status === 'finished' || isLive) && (
                <span className="ml-2 px-2 py-0.2 rounded-md bg-gray-900 text-white font-mono font-black text-xs">
                  {match.scoreA ?? 0} - {match.scoreB ?? 0}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-bold uppercase",
            match.status === 'open' ? "bg-emerald-100 text-emerald-700" : 
            isLive ? "bg-red-100 text-red-700 font-black" :
            match.status === 'finished' ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-600"
          )}>
            {isLive ? 'Ao Vivo' : match.status === 'open' ? t.confirm : match.status === 'finished' ? 'Fim' : t.matchFull}
          </div>

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                if (window.confirm(lang === 'pt' ? 'Tem certeza de que deseja excluir esta partida?' : 'Delete this match?')) {
                  onDelete(match.id);
                }
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              title={lang === 'pt' ? 'Excluir Partida' : 'Delete Match'}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5 mb-5">
        <div className="flex items-center text-gray-600 text-sm">
          <Calendar className="w-4 h-4 mr-2 opacity-50" />
          {format(match.date, "HH:mm")}
        </div>
        <div className="flex items-center text-gray-600 text-sm">
          <MapPin className="w-4 h-4 mr-2 opacity-50" />
          <span className="truncate">{match.location.address}</span>
        </div>
        <div className="flex items-center text-gray-600 text-sm">
          <Users className="w-4 h-4 mr-2 opacity-50" />
          {confirmedCount} / {match.maxPlayers} {t.matches}
        </div>
        <div className="flex items-center text-gray-600 text-sm">
          <DollarSign className="w-4 h-4 mr-2 opacity-50" />
          {match.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex -space-x-2 overflow-hidden">
          {registrations.slice(0, 5).map((reg, i) => (
            <div
              key={reg.id}
              className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500"
            >
              {i === 4 && registrations.length > 5 ? `+${registrations.length - 4}` : (i + 1)}
            </div>
          ))}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
      </div>
    </div>
  );
}
