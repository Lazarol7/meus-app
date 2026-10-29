import React from 'react';
import { UserProfile, MatchStats } from '../types';
import { LANGUAGES, Language } from '../constants';
import { Trophy, Target, Zap, Shield, Star } from 'lucide-react';

interface PlayerStatsProps {
  player: UserProfile;
  stats: MatchStats[];
  lang: Language;
}

export function PlayerStats({ player, stats, lang }: PlayerStatsProps) {
  const t = LANGUAGES[lang];

  const totalGoals = stats.reduce((acc, s) => acc + (s.goals || 0), 0);
  const totalAssists = stats.reduce((acc, s) => acc + (s.assists || 0), 0);
  const totalMOTM = stats.filter(s => s.isMOTM).length;
  const totalGA = totalGoals + totalAssists;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center text-center">
        <Target className="w-6 h-6 text-emerald-500 mb-2" />
        <span className="text-2xl font-black text-gray-900">{totalGoals}</span>
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t.goals}</span>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center text-center">
        <Zap className="w-6 h-6 text-blue-500 mb-2" />
        <span className="text-2xl font-black text-gray-900">{totalAssists}</span>
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t.assists}</span>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center text-center">
        <span className="text-xl mb-1.5">⚡</span>
        <span className="text-2xl font-black text-purple-700">{totalGA}</span>
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Gols + Assist.</span>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center text-center">
        <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
        <span className="text-2xl font-black text-gray-900">{totalMOTM}</span>
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t.motm}</span>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1">
        <div className="flex gap-1 mb-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <Zap className="w-4 h-4 text-yellow-400" />
          <Target className="w-4 h-4 text-red-400" />
        </div>
        <span className="text-2xl font-black text-gray-900">
          {((player.ratings.defense + player.ratings.passing + player.ratings.finishing) / 3).toFixed(1)}
        </span>
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Nota Técnica</span>
      </div>
    </div>
  );
}
