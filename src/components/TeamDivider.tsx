import React from 'react';
import { motion } from 'framer-motion';
import { Users, Shuffle, Shield, Zap, Target } from 'lucide-react';
import { UserProfile, Registration } from '../types';
import { LANGUAGES } from '../constants';

interface TeamDividerProps {
  players: UserProfile[];
  registrations: Registration[];
  language: keyof typeof LANGUAGES;
  onPlayerClick?: (player: UserProfile) => void;
}

export const TeamDivider: React.FC<TeamDividerProps> = ({
  players,
  registrations,
  language,
  onPlayerClick,
}) => {
  const [teams, setTeams] = React.useState<{ teamA: UserProfile[]; teamB: UserProfile[] } | null>(null);

  const confirmedPlayers = players.filter(p => 
    registrations.some(r => r.userId === p.uid && r.status === 'confirmed')
  );

  const t = {
    en: {
      title: 'Balanced Teams',
      generate: 'Generate Teams',
      teamA: 'Team A',
      teamB: 'Team B',
      empty: 'No players registered yet',
      avgRating: 'Avg Rating',
    },
    pt: {
      title: 'Equipes Equilibradas',
      generate: 'Gerar Equipes',
      teamA: 'Equipe A',
      teamB: 'Equipe B',
      empty: 'Nenhum jogador registrado ainda',
      avgRating: 'Média',
    },
    xh: {
      title: 'Swipano leswi ringaneke',
      generate: 'Endla Swipano',
      teamA: 'Xipano A',
      teamB: 'Xipano B',
      empty: 'Ku hava vatlangi lava tsarisiweke',
      avgRating: 'Xiringaniso',
    },
  }[language];

  const calculateOverall = (p: UserProfile) => {
    const r = p.ratings;
    if (!r) return 0;
    return (r.defense + r.passing + r.finishing) / 3;
  };

  const generateTeams = () => {
    // Sort players by overall skill
    const sorted = [...confirmedPlayers].sort((a, b) => calculateOverall(b) - calculateOverall(a));
    
    const teamA: UserProfile[] = [];
    const teamB: UserProfile[] = [];
    
    // Snake draft for balancing
    sorted.forEach((player, index) => {
      if (index % 2 === 0) {
        teamA.push(player);
      } else {
        teamB.push(player);
      }
    });

    // Randomize slightly within pairs to avoid identical teams every time
    for (let i = 0; i < Math.min(teamA.length, teamB.length); i++) {
      if (Math.random() > 0.5) {
        const temp = teamA[i];
        teamA[i] = teamB[i];
        teamB[i] = temp;
      }
    }

    setTeams({ teamA, teamB });
  };

  const getTeamAvg = (team: UserProfile[]) => {
    if (team.length === 0) return 0;
    return team.reduce((acc, p) => acc + calculateOverall(p), 0) / team.length;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="text-emerald-600" size={24} />
          <h3 className="font-bold text-gray-900">{t.title}</h3>
        </div>
        <button
          onClick={generateTeams}
          disabled={confirmedPlayers.length < 2}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Shuffle size={18} />
          {t.generate}
        </button>
      </div>

      {teams ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: t.teamA, players: teams.teamA, color: 'blue' },
            { name: t.teamB, players: teams.teamB, color: 'red' },
          ].map((team) => (
            <div key={team.name} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-black/5">
                <span className={`font-bold text-${team.color}-600`}>{team.name}</span>
                <span className="text-xs text-gray-500">
                  {t.avgRating}: <span className="font-bold text-gray-900">{getTeamAvg(team.players).toFixed(1)}</span>
                </span>
              </div>
              <div className="space-y-2">
                {team.players.map((p) => (
                  <div 
                    key={p.uid} 
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-black/5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onPlayerClick?.(p)}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`}
                        alt={p.displayName}
                        className="w-8 h-8 rounded-full border border-black/5"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-sm font-medium text-gray-900">{p.displayName}</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <Shield size={12} className="text-blue-500" />
                        <span className="text-[10px] font-bold">{p.ratings?.defense || 0}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Zap size={12} className="text-yellow-500" />
                        <span className="text-[10px] font-bold">{p.ratings?.passing || 0}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Target size={12} className="text-red-500" />
                        <span className="text-[10px] font-bold">{p.ratings?.finishing || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <Users size={48} className="mx-auto mb-4 opacity-20" />
          <p>{confirmedPlayers.length < 2 ? t.empty : 'Click generate to balance teams'}</p>
        </div>
      )}
    </div>
  );
};
