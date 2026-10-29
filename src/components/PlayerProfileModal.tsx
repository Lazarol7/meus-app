import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, Zap, Shield, Star, Award } from 'lucide-react';
import { UserProfile, MatchStats } from '../types';
import { LANGUAGES, Language } from '../constants';
import { cn } from '../lib/utils';

interface PlayerProfileModalProps {
  player: UserProfile | null;
  stats: MatchStats[];
  lang: Language;
  onClose: () => void;
}

export function PlayerProfileModal({ player, stats, lang, onClose }: PlayerProfileModalProps) {
  const t = LANGUAGES[lang];

  if (!player) return null;

  const playerStats = {
    goals: stats.reduce((acc, s) => acc + s.goals, 0),
    assists: stats.reduce((acc, s) => acc + s.assists, 0),
    motm: stats.filter(s => s.isMOTM).length,
    matches: new Set(stats.map(s => s.matchId)).size
  };

  return (
    <AnimatePresence>
      {player && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl"
          >
            {/* Header / Cover */}
            <div className="h-32 bg-emerald-600 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
              >
                <X size={20} />
              </button>
              <div className="absolute -bottom-12 left-6">
                <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl relative">
                  {player.photoURL ? (
                    <img
                      src={player.photoURL}
                      alt={player.displayName}
                      className="w-full h-full rounded-[20px] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[20px] bg-emerald-100 flex items-center justify-center text-emerald-600 text-3xl font-bold">
                      {player.displayName[0]}
                    </div>
                  )}
                  {player.clubLogoURL && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white border-2 border-emerald-50 shadow-lg flex items-center justify-center overflow-hidden">
                      <img 
                        src={player.clubLogoURL} 
                        alt="Club Logo" 
                        className="w-full h-full object-contain p-1"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-16 px-6 pb-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{player.displayName}</h2>
                {player.clubName && (
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                    {player.clubName}
                  </p>
                )}
                <p className="text-sm text-gray-500 font-medium mt-1">
                  {playerStats.matches} {t.matches} • {player.language === 'pt' ? 'Membro desde' : 'Member since'} {new Date(player.createdAt).getFullYear()}
                </p>
              </div>

              {player.description && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 italic text-gray-600 text-sm">
                  "{player.description}"
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-emerald-50 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Target className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="text-base font-black text-emerald-900">{playerStats.goals}</span>
                  <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">{t.goals}</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Zap className="w-4 h-4 text-blue-600 mb-1" />
                  <span className="text-base font-black text-blue-900">{playerStats.assists}</span>
                  <span className="text-[9px] uppercase font-bold text-blue-600 tracking-wider">{t.assists}</span>
                </div>
                <div className="bg-purple-50 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-black text-purple-600 mb-0.5">⚡</span>
                  <span className="text-base font-black text-purple-900">{playerStats.goals + playerStats.assists}</span>
                  <span className="text-[9px] uppercase font-bold text-purple-600 tracking-wider">G + A</span>
                </div>
                <div className="bg-yellow-50 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Trophy className="w-4 h-4 text-yellow-600 mb-1" />
                  <span className="text-base font-black text-yellow-900">{playerStats.motm}</span>
                  <span className="text-[9px] uppercase font-bold text-yellow-600 tracking-wider">Craque</span>
                </div>
              </div>

              {/* Ratings */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <Award className="w-4 h-4 mr-2" />
                  {t.performance}
                </h3>
                <div className="space-y-3">
                  <RatingBar label={t.defense} value={player.ratings.defense} icon={<Shield className="w-4 h-4" />} color="bg-blue-500" />
                  <RatingBar label={t.passing} value={player.ratings.passing} icon={<Zap className="w-4 h-4" />} color="bg-emerald-500" />
                  <RatingBar label={t.finishing} value={player.ratings.finishing} icon={<Target className="w-4 h-4" />} color="bg-red-500" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function RatingBar({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs font-bold">
        <div className="flex items-center text-gray-600">
          <span className="mr-2 opacity-50">{icon}</span>
          {label}
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={10}
              className={cn(
                star <= value ? "fill-current text-yellow-500" : "text-gray-200"
              )}
            />
          ))}
        </div>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / 5) * 100}%` }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}
