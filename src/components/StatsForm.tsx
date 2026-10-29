import React, { useState } from 'react';
import { UserProfile, MatchStats } from '../types';
import { LANGUAGES, Language } from '../constants';
import { Trophy, Target, Zap, Save, User } from 'lucide-react';

interface StatsFormProps {
  matchId: string;
  players: UserProfile[];
  lang: Language;
  onSave: (stats: Omit<MatchStats, 'id'>[], scoreA: number, scoreB: number) => void;
  onCancel: () => void;
}

export function StatsForm({ matchId, players, lang, onSave, onCancel }: StatsFormProps) {
  const t = LANGUAGES[lang];
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [playerStats, setPlayerStats] = useState<Record<string, { goals: number, assists: number, isMOTM: boolean }>>(
    players.reduce((acc, p) => ({
      ...acc,
      [p.uid]: { goals: 0, assists: 0, isMOTM: false }
    }), {})
  );

  const handleStatChange = (uid: string, field: 'goals' | 'assists' | 'isMOTM', value: number | boolean) => {
    setPlayerStats(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [field]: value }
    }));
  };

  const handleSave = () => {
    const statsToSave = players.map(p => ({
      matchId,
      playerId: p.uid,
      ...playerStats[p.uid]
    }));
    onSave(statsToSave, scoreA, scoreB);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-8">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Súmula Digital</h2>
        <button onClick={onCancel} className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
          {t.cancel}
        </button>
      </div>

      {/* Scoreboard */}
      <div className="flex items-center justify-center gap-8 py-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Equipa A</span>
          <input
            type="number"
            value={scoreA}
            onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
            className="w-16 h-16 text-3xl font-bold text-center bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <span className="text-2xl font-bold text-gray-300">VS</span>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Equipa B</span>
          <input
            type="number"
            value={scoreB}
            onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
            className="w-16 h-16 text-3xl font-bold text-center bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Player Stats List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.stats}</h3>
        <div className="divide-y divide-gray-50">
          {players.map((p) => (
            <div key={p.uid} className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs mr-3">
                    {p.displayName[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{p.displayName}</span>
                </div>
                <button
                  onClick={() => {
                    // Only one MOTM per match
                    const newStats = { ...playerStats };
                    Object.keys(newStats).forEach(uid => {
                      newStats[uid].isMOTM = uid === p.uid ? !newStats[uid].isMOTM : false;
                    });
                    setPlayerStats(newStats);
                  }}
                  className={`p-2 rounded-lg transition-all ${
                    playerStats[p.uid].isMOTM
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-gray-50 text-gray-300 hover:text-gray-400"
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center text-emerald-600">
                    <Target className="w-4 h-4 mr-2" />
                    <span className="text-xs font-bold uppercase tracking-widest">{t.goals}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleStatChange(p.uid, 'goals', Math.max(0, playerStats[p.uid].goals - 1))}
                      className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-400 hover:text-gray-600"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{playerStats[p.uid].goals}</span>
                    <button
                      onClick={() => handleStatChange(p.uid, 'goals', playerStats[p.uid].goals + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-400 hover:text-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center text-blue-600">
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="text-xs font-bold uppercase tracking-widest">{t.assists}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleStatChange(p.uid, 'assists', Math.max(0, playerStats[p.uid].assists - 1))}
                      className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-400 hover:text-gray-600"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{playerStats[p.uid].assists}</span>
                    <button
                      onClick={() => handleStatChange(p.uid, 'assists', playerStats[p.uid].assists + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-400 hover:text-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center shadow-lg shadow-emerald-600/20"
      >
        <Save className="w-5 h-5 mr-2" />
        Finalizar Partida e Salvar Súmula
      </button>
    </div>
  );
}
