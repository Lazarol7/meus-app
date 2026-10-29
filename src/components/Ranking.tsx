import React, { useState, useMemo } from 'react';
import { UserProfile, MatchStats, Match, Club, ManualScorer } from '../types';
import { LANGUAGES, Language } from '../constants';
import { 
  Trophy, Target, Zap, Star, Shield, Filter, Award, 
  Search, Flame, ChevronRight, TrendingUp, Sparkles,
  Users, BarChart3, HelpCircle, Plus, Trash2, X, AlertCircle, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { ImageUploadPicker } from './ImageUploadPicker';

export type LeaderboardCategory = 'scorers' | 'assists' | 'ga' | 'performance';

interface RankingProps {
  players: UserProfile[];
  stats: MatchStats[];
  matches?: Match[];
  clubs?: Club[];
  manualScorers?: ManualScorer[];
  currentUser?: UserProfile | null;
  lang: Language;
  onPlayerClick: (player: UserProfile) => void;
  onSaveManualScorer?: (data: Omit<ManualScorer, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteManualScorer?: (id: string) => Promise<void>;
  defaultCategory?: LeaderboardCategory;
}

export function Ranking({ 
  players, 
  stats, 
  matches = [], 
  clubs = [], 
  manualScorers = [],
  currentUser = null,
  lang, 
  onPlayerClick,
  onSaveManualScorer,
  onDeleteManualScorer,
  defaultCategory = 'scorers'
}: RankingProps) {
  const t = LANGUAGES[lang];
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'lazaroatalia80@gmail.com';

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<LeaderboardCategory>(defaultCategory);
  
  // Selected League Filter ("all" or specific league name)
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  
  // Player Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Modal to add a manual scorer
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [scorerName, setScorerName] = useState('');
  const [scorerGoals, setScorerGoals] = useState('');
  const [scorerAssists, setScorerAssists] = useState('');
  const [scorerMotm, setScorerMotm] = useState('');
  const [scorerClub, setScorerClub] = useState('');
  const [scorerLeague, setScorerLeague] = useState('');
  const [scorerPhoto, setScorerPhoto] = useState('');
  const [scorerMatches, setScorerMatches] = useState('');
  const [clubPlayerSearch, setClubPlayerSearch] = useState('');
  const [selectedClubFilterForRoster, setSelectedClubFilterForRoster] = useState('');
  const [isSavingScorer, setIsSavingScorer] = useState(false);
  const [scorerError, setScorerError] = useState<string | null>(null);

  // Extract all players added to clubs (even without a registered user account)
  const clubRosterPlayers = useMemo(() => {
    const results: Array<{
      id: string;
      name: string;
      clubName: string;
      clubLeague?: string;
      clubLogo?: string;
      position?: string;
      number?: number;
      photoURL?: string;
    }> = [];

    clubs.forEach(club => {
      // 1. From detailed playerRoster
      if (club.playerRoster && club.playerRoster.length > 0) {
        club.playerRoster.forEach(rp => {
          results.push({
            id: rp.id || `${club.id}_${rp.name}`,
            name: rp.name,
            clubName: club.name,
            clubLeague: club.league,
            clubLogo: club.logoURL,
            position: rp.position,
            number: rp.number,
            photoURL: rp.photoURL || club.logoURL,
          });
        });
      }
      // 2. From simple players name list
      if (club.players && club.players.length > 0) {
        club.players.forEach((pName, idx) => {
          if (!results.some(r => r.clubName === club.name && r.name.toLowerCase() === pName.toLowerCase())) {
            results.push({
              id: `${club.id}_name_${idx}`,
              name: pName,
              clubName: club.name,
              clubLeague: club.league,
              clubLogo: club.logoURL,
              photoURL: club.logoURL,
            });
          }
        });
      }
    });

    return results;
  }, [clubs]);

  // Filtered club roster players for modal picker
  const filteredRosterOptions = useMemo(() => {
    return clubRosterPlayers.filter(p => {
      if (selectedClubFilterForRoster && p.clubName !== selectedClubFilterForRoster) {
        return false;
      }
      if (clubPlayerSearch.trim()) {
        const q = clubPlayerSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.clubName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [clubRosterPlayers, selectedClubFilterForRoster, clubPlayerSearch]);

  // Extract all distinct leagues from matches & manual scorers
  const availableLeagues = useMemo(() => {
    const list = [
      ...matches.map(m => m.league?.trim()).filter(Boolean),
      ...manualScorers.map(m => m.league?.trim()).filter(Boolean),
    ] as string[];
    return Array.from(new Set(list));
  }, [matches, manualScorers]);

  // Filter stats by selected league
  const filteredStats = useMemo(() => {
    if (selectedLeague === 'all') {
      return stats;
    }
    const matchingMatchIds = new Set(
      matches
        .filter(m => (m.league?.trim() || 'Liga do Bairro') === selectedLeague)
        .map(m => m.id)
    );
    return stats.filter(s => matchingMatchIds.has(s.matchId));
  }, [stats, matches, selectedLeague]);

  // Matches in the selected league
  const relevantMatches = useMemo(() => {
    if (selectedLeague === 'all') return matches;
    return matches.filter(m => (m.league?.trim() || 'Liga do Bairro') === selectedLeague);
  }, [matches, selectedLeague]);

  // Aggregate stats per player (both match-recorded and manual top scorers)
  const playerStatsList = useMemo(() => {
    // 1. Process regular player profiles ONLY IF they actually have match stats recorded (goals > 0, assists > 0, matchesPlayed > 0, or motmCount > 0)
    // The user explicitly requested: "Na parte de artilheiros o app nao pode colocar as pessoas cadastrados no app automaticamente"
    const registeredList = players
      .map(player => {
        const pStats = filteredStats.filter(s => s.playerId === player.uid);
        const goals = pStats.reduce((acc, s) => acc + (s.goals || 0), 0);
        const assists = pStats.reduce((acc, s) => acc + (s.assists || 0), 0);
        const motmCount = pStats.filter(s => s.isMOTM).length;
        const ga = goals + assists;
        const matchesPlayed = pStats.length;

        const def = player.ratings?.defense || 3;
        const pas = player.ratings?.passing || 3;
        const fin = player.ratings?.finishing || 3;
        const technicalAvg = Number(((def + pas + fin) / 3).toFixed(1));

        const performancePoints = (goals * 4) + (assists * 3) + (motmCount * 6) + (matchesPlayed * 2) + Math.round(technicalAvg * 2);

        const matchContribution = matchesPlayed > 0 ? (ga / matchesPlayed) : 0;
        const rawIndex = (technicalAvg * 1.2) + (matchContribution * 1.5) + (motmCount * 0.8);
        const performanceIndex = Math.min(10, Math.max(5.0, Number((5.0 + rawIndex * 0.5).toFixed(1))));

        const club = clubs.find(c => c.name === player.clubName || c.id === player.clubId);
        const clubLogo = club?.logoURL || player.clubLogoURL;

        return {
          ...player,
          goals,
          assists,
          ga,
          motmCount,
          matchesPlayed,
          goalsPerMatch: matchesPlayed > 0 ? (goals / matchesPlayed).toFixed(2) : '0.00',
          assistsPerMatch: matchesPlayed > 0 ? (assists / matchesPlayed).toFixed(2) : '0.00',
          gaPerMatch: matchesPlayed > 0 ? (ga / matchesPlayed).toFixed(2) : '0.00',
          technicalAvg,
          performancePoints,
          performanceIndex,
          clubLogo,
          isManual: false,
          manualId: undefined as string | undefined,
          league: undefined as string | undefined,
          createdBy: undefined as string | undefined,
          createdByName: undefined as string | undefined,
        };
      })
      // Strictly filter out any registered users who haven't played, scored or assisted
      .filter(p => p.goals > 0 || p.assists > 0 || p.matchesPlayed > 0 || p.motmCount > 0);

    // 2. Process manual scorers (added from club rosters or directly)
    const filteredManual = manualScorers.filter(m => {
      if (selectedLeague === 'all') return true;
      return (m.league?.trim() || 'Liga do Bairro') === selectedLeague;
    });

    const manualList = filteredManual.map(m => {
      const goals = m.goals || 0;
      const assists = m.assists || 0;
      const motmCount = m.motmCount || 0;
      const ga = goals + assists;
      const matchesPlayed = m.matchesPlayed || (goals > 0 ? Math.max(1, Math.ceil(goals / 1.5)) : 1);
      const technicalAvg = 4.2;
      const performancePoints = (goals * 4) + (assists * 3) + (motmCount * 6) + (matchesPlayed * 2) + 8;
      const performanceIndex = Math.min(10, Math.max(6.0, Number((6.0 + (goals * 0.2) + (motmCount * 0.3)).toFixed(1))));

      const club = clubs.find(c => c.name === m.clubName);
      const clubLogo = club?.logoURL || m.clubLogoURL;

      return {
        uid: `manual_${m.id}`,
        displayName: m.playerName,
        email: '',
        ratings: { defense: 3, passing: 4, finishing: 5 } as UserProfile['ratings'],
        language: 'pt' as const,
        createdAt: m.createdAt,
        clubName: m.clubName,
        clubLogoURL: clubLogo,
        photoURL: m.photoURL,
        goals,
        assists,
        ga,
        motmCount,
        matchesPlayed,
        goalsPerMatch: matchesPlayed > 0 ? (goals / matchesPlayed).toFixed(2) : '0.00',
        assistsPerMatch: matchesPlayed > 0 ? (assists / matchesPlayed).toFixed(2) : '0.00',
        gaPerMatch: matchesPlayed > 0 ? (ga / matchesPlayed).toFixed(2) : '0.00',
        technicalAvg,
        performancePoints,
        performanceIndex,
        clubLogo,
        isManual: true,
        manualId: m.id,
        createdBy: m.createdBy,
        createdByName: m.createdByName,
        league: m.league,
      };
    });

    return [...registeredList, ...manualList];
  }, [players, filteredStats, clubs, manualScorers, selectedLeague]);

  // Sort and filter according to activeTab and searchQuery
  const sortedPlayers = useMemo(() => {
    let list = [...playerStatsList];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.displayName.toLowerCase().includes(q) ||
        (p.clubName && p.clubName.toLowerCase().includes(q))
      );
    }

    // Sort according to category with strict positive criteria (no 0-stat clutter)
    switch (activeTab) {
      case 'scorers':
        // Only players who actually scored at least 1 goal appear in Artilharia!
        list = list.filter(p => p.goals > 0);
        return list.sort((a, b) => {
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (b.ga !== a.ga) return b.ga - a.ga;
          return a.matchesPlayed - b.matchesPlayed;
        });
      case 'assists':
        // Only players who provided at least 1 assist!
        list = list.filter(p => p.assists > 0);
        return list.sort((a, b) => {
          if (b.assists !== a.assists) return b.assists - a.assists;
          if (b.ga !== a.ga) return b.ga - a.ga;
          return a.matchesPlayed - b.matchesPlayed;
        });
      case 'ga':
        // Only players with at least 1 goal or assist participation!
        list = list.filter(p => p.ga > 0);
        return list.sort((a, b) => {
          if (b.ga !== a.ga) return b.ga - a.ga;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return a.matchesPlayed - b.matchesPlayed;
        });
      case 'performance':
      default:
        // Only players with at least 1 match played, goal, assist, or MOTM award
        list = list.filter(p => p.matchesPlayed > 0 || p.motmCount > 0 || p.goals > 0 || p.assists > 0);
        return list.sort((a, b) => {
          if (b.performancePoints !== a.performancePoints) return b.performancePoints - a.performancePoints;
          if (b.motmCount !== a.motmCount) return b.motmCount - a.motmCount;
          return b.ga - a.ga;
        });
    }
  }, [playerStatsList, activeTab, searchQuery]);

  // Quick league metrics
  const leagueMetrics = useMemo(() => {
    const totalGoals = filteredStats.reduce((acc, s) => acc + (s.goals || 0), 0);
    const totalAssists = filteredStats.reduce((acc, s) => acc + (s.assists || 0), 0);
    const totalMatches = relevantMatches.length;
    const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0.0';
    return {
      totalGoals,
      totalAssists,
      totalMatches,
      avgGoalsPerMatch,
    };
  }, [filteredStats, relevantMatches]);

  // Top 3 Podium
  const top3 = sortedPlayers.slice(0, 3);
  const remainingPlayers = sortedPlayers.slice(3);

  // Category labels and icons
  const categories = [
    {
      id: 'scorers' as LeaderboardCategory,
      label: lang === 'pt' ? 'Artilharia' : 'Top Scorers',
      subtitle: lang === 'pt' ? 'Quem fez mais gols' : 'Most goals scored',
      icon: Target,
      badge: '⚽',
      metricLabel: lang === 'pt' ? 'Gols' : 'Goals',
      getMetric: (p: typeof playerStatsList[0]) => p.goals,
      getSecondary: (p: typeof playerStatsList[0]) => `${p.goalsPerMatch} G/J`,
    },
    {
      id: 'assists' as LeaderboardCategory,
      label: lang === 'pt' ? 'Garçons' : 'Top Assists',
      subtitle: lang === 'pt' ? 'Passes para o gol' : 'Most assists',
      icon: Zap,
      badge: '🅰️',
      metricLabel: lang === 'pt' ? 'Assistências' : 'Assists',
      getMetric: (p: typeof playerStatsList[0]) => p.assists,
      getSecondary: (p: typeof playerStatsList[0]) => `${p.assistsPerMatch} A/J`,
    },
    {
      id: 'ga' as LeaderboardCategory,
      label: lang === 'pt' ? 'Gols + Assistências' : 'G + A Combined',
      subtitle: lang === 'pt' ? 'Participações em gol' : 'Goal contributions',
      icon: Flame,
      badge: '⚡',
      metricLabel: 'G+A',
      getMetric: (p: typeof playerStatsList[0]) => p.ga,
      getSecondary: (p: typeof playerStatsList[0]) => `${p.goals}G + ${p.assists}A`,
    },
    {
      id: 'performance' as LeaderboardCategory,
      label: lang === 'pt' ? 'Desempenho Geral' : 'Overall MVP',
      subtitle: lang === 'pt' ? 'Resumo geral & notas' : 'Player rating & impact',
      icon: Trophy,
      badge: '🌟',
      metricLabel: lang === 'pt' ? 'Pontos' : 'Points',
      getMetric: (p: typeof playerStatsList[0]) => p.performancePoints,
      getSecondary: (p: typeof playerStatsList[0]) => `Nota: ${p.performanceIndex}`,
    },
  ];

  const currentCategory = categories.find(c => c.id === activeTab)!;

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP LEAGUE & CHAMPIONSHIP FILTER HEADER (BeSoccer Style)
          ========================================================================= */}
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white rounded-3xl p-5 md:p-6 border border-white/10 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                BeSoccer Stats & Leaderboards
              </span>
              <span className="text-[10px] text-gray-400">
                {relevantMatches.length} {lang === 'pt' ? 'partidas' : 'matches'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
              <Trophy className="w-7 h-7 text-amber-400 fill-amber-400 shrink-0" />
              <span>{lang === 'pt' ? 'Líderes & Estatísticas' : 'Leaders & Statistics'}</span>
            </h2>
            <p className="text-xs text-gray-300 mt-1 max-w-xl">
              {lang === 'pt'
                ? 'Artilharia oficial, líderes de assistência, participações em gols e ranking de desempenho individual separados por campeonato.'
                : 'Official top scorers, assist leaders, goal contributions, and individual performance rankings segmented by championship.'}
            </p>
          </div>

          {/* Top Actions: Add Scorer & League Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            {/* Quick Add Scorer Button */}
            {onSaveManualScorer && (
              <button
                onClick={() => {
                  setScorerName('');
                  setScorerGoals('');
                  setScorerAssists('');
                  setScorerClub('');
                  setScorerLeague(selectedLeague !== 'all' ? selectedLeague : '');
                  setScorerPhoto('');
                  setScorerMatches('');
                  setScorerError(null);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                title={lang === 'pt' ? 'Adicionar jogador e quantos gols ele tem' : 'Add top scorer and their goal count'}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{lang === 'pt' ? 'Adicionar Artilheiro' : 'Add Top Scorer'}</span>
              </button>
            )}

            {/* Championship / League Selector Dropdown */}
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10">
              <label className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider flex items-center gap-1.5 mb-1 px-1">
                <Filter className="w-3 h-3 text-emerald-400" />
                {lang === 'pt' ? 'Filtrar por Liga / Campeonato' : 'Filter by League'}
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full md:min-w-[200px] bg-gray-900 text-white text-xs font-bold rounded-xl px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <option value="all">
                  🌐 {lang === 'pt' ? 'Todas as Competições (Geral)' : 'All Competitions (Overall)'}
                </option>
                {availableLeagues.map(leagueName => (
                  <option key={leagueName} value={leagueName}>
                    🏆 {leagueName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* League Quick Numbers Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              {lang === 'pt' ? 'Jogos Realizados' : 'Matches'}
            </span>
            <span className="text-xl font-black text-white">{leagueMetrics.totalMatches}</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
              {lang === 'pt' ? 'Golos Marcados' : 'Goals Scored'}
            </span>
            <span className="text-xl font-black text-emerald-400">{leagueMetrics.totalGoals} ⚽</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block">
              {lang === 'pt' ? 'Assistências' : 'Assists'}
            </span>
            <span className="text-xl font-black text-blue-400">{leagueMetrics.totalAssists} 🎯</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
              {lang === 'pt' ? 'Média Golos/Jogo' : 'Avg Goals/Match'}
            </span>
            <span className="text-xl font-black text-amber-400">{leagueMetrics.avgGoalsPerMatch}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CATEGORY TABS (Artilharia, Garçons, G+A, Desempenho Geral)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                "p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer",
                isActive 
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]" 
                  : "bg-white text-gray-700 border-black/5 hover:border-emerald-200 hover:bg-emerald-50/40"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-lg">{cat.badge}</span>
                <Icon className={cn("w-4 h-4", isActive ? "text-emerald-200" : "text-gray-400")} />
              </div>
              <div>
                <p className={cn("text-xs font-black leading-tight", isActive ? "text-white" : "text-gray-900")}>
                  {cat.label}
                </p>
                <p className={cn("text-[10px] mt-0.5 truncate", isActive ? "text-emerald-100" : "text-gray-400")}>
                  {cat.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Manual Top Scorer Banner / Quick Action */}
      {onSaveManualScorer && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-emerald-500/10 border border-amber-300/60 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-gray-950 flex items-center justify-center font-black text-lg shadow-sm shrink-0">
              ⚽
            </div>
            <div>
              <p className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>{lang === 'pt' ? 'Registrar Artilheiro Diretamente' : 'Record Top Scorer Directly'}</span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.2 rounded-full font-bold">
                  {manualScorers.length} {lang === 'pt' ? 'registrados' : 'recorded'}
                </span>
              </p>
              <p className="text-xs text-amber-900/80 mt-0.5">
                {lang === 'pt'
                  ? 'Adicione o jogador que tem mais gols, seu nome e quantidade de gols para aparecer no topo da artilharia.'
                  : 'Add the top scorer player, their name and goal count to appear at the top of the leaderboard.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setScorerName('');
              setScorerGoals('');
              setScorerAssists('');
              setScorerClub('');
              setScorerLeague(selectedLeague !== 'all' ? selectedLeague : '');
              setScorerPhoto('');
              setScorerMatches('');
              setScorerError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{lang === 'pt' ? '+ Adicionar Artilheiro' : '+ Add Scorer'}</span>
          </button>
        </div>
      )}

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={lang === 'pt' ? 'Buscar jogador por nome ou clube...' : 'Search player by name or club...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
          >
            Limpar
          </button>
        )}
      </div>

      {/* =========================================================================
          PODIUM PRESENTATION (Top 3 Players in Selected Category)
          ========================================================================= */}
      {top3.length > 0 && !searchQuery && (
        <div className="bg-gradient-to-b from-gray-900 to-gray-950 text-white rounded-3xl p-5 border border-white/10 shadow-lg">
          <div className="text-center mb-5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-400">
              Pódio dos Craques · {currentCategory.label}
            </span>
            <h3 className="text-lg font-black text-white">
              {lang === 'pt' ? 'Os 3 Melhores do Campeonato' : 'Top 3 Performers'}
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4 items-end max-w-lg mx-auto pt-2">
            {/* 2nd Place (Silver) */}
            {top3[1] && (
              <div 
                onClick={() => onPlayerClick(top3[1])}
                className="flex flex-col items-center text-center cursor-pointer group order-1"
              >
                <div className="relative mb-2">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-slate-300 p-0.5 bg-slate-800 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                    {top3[1].photoURL ? (
                      <img src={top3[1].photoURL} alt={top3[1].displayName} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-200">
                        {top3[1].displayName[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute -top-2 -left-1 w-6 h-6 rounded-full bg-slate-200 text-slate-900 font-black text-xs flex items-center justify-center shadow-md border border-white">
                    2º
                  </div>
                  {top3[1].clubLogo && (
                    <img 
                      src={top3[1].clubLogo} 
                      alt="" 
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full object-cover border border-white shadow-xs" 
                    />
                  )}
                </div>
                <p className="text-xs font-bold text-white truncate max-w-[90px] md:max-w-[110px]">
                  {top3[1].displayName}
                </p>
                <p className="text-[10px] text-gray-400 truncate max-w-[80px]">
                  {top3[1].clubName || 'Sem Clube'}
                </p>
                <div className="mt-2 w-full bg-slate-800/80 rounded-t-xl py-3 px-1 border-t-2 border-slate-300 text-center">
                  <span className="text-base md:text-lg font-black text-slate-200">
                    {currentCategory.getMetric(top3[1])}
                  </span>
                  <span className="block text-[9px] text-slate-400 uppercase font-bold">
                    {currentCategory.metricLabel}
                  </span>
                </div>
              </div>
            )}

            {/* 1st Place (Gold - Taller Step) */}
            {top3[0] && (
              <div 
                onClick={() => onPlayerClick(top3[0])}
                className="flex flex-col items-center text-center cursor-pointer group order-2"
              >
                <div className="relative mb-2">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-3 border-amber-400 p-0.5 bg-amber-950 shadow-xl shadow-amber-500/20 group-hover:scale-105 transition-transform overflow-hidden ring-4 ring-amber-400/20">
                    {top3[0].photoURL ? (
                      <img src={top3[0].photoURL} alt={top3[0].displayName} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-amber-900 flex items-center justify-center font-bold text-amber-200 text-lg">
                        {top3[0].displayName[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute -top-2.5 -left-1 w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-black text-xs flex items-center justify-center shadow-lg border border-white">
                    👑 1º
                  </div>
                  {top3[0].clubLogo && (
                    <img 
                      src={top3[0].clubLogo} 
                      alt="" 
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full object-cover border-2 border-amber-400 shadow-sm" 
                    />
                  )}
                </div>
                <p className="text-xs md:text-sm font-black text-amber-300 truncate max-w-[100px] md:max-w-[130px]">
                  {top3[0].displayName}
                </p>
                <p className="text-[10px] text-gray-300 truncate max-w-[90px]">
                  {top3[0].clubName || 'Sem Clube'}
                </p>
                <div className="mt-2 w-full bg-gradient-to-b from-amber-500/30 to-amber-900/40 rounded-t-2xl py-4 px-1 border-t-3 border-amber-400 text-center shadow-lg">
                  <span className="text-xl md:text-2xl font-black text-amber-400">
                    {currentCategory.getMetric(top3[0])}
                  </span>
                  <span className="block text-[10px] text-amber-200 uppercase font-black">
                    {currentCategory.metricLabel}
                  </span>
                  <span className="text-[9px] text-amber-300/80 font-bold block mt-0.5">
                    {currentCategory.getSecondary(top3[0])}
                  </span>
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {top3[2] && (
              <div 
                onClick={() => onPlayerClick(top3[2])}
                className="flex flex-col items-center text-center cursor-pointer group order-3"
              >
                <div className="relative mb-2">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-amber-700 p-0.5 bg-amber-950 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                    {top3[2].photoURL ? (
                      <img src={top3[2].photoURL} alt={top3[2].displayName} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-amber-950 flex items-center justify-center font-bold text-amber-300">
                        {top3[2].displayName[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute -top-2 -left-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md border border-white">
                    3º
                  </div>
                  {top3[2].clubLogo && (
                    <img 
                      src={top3[2].clubLogo} 
                      alt="" 
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full object-cover border border-white shadow-xs" 
                    />
                  )}
                </div>
                <p className="text-xs font-bold text-white truncate max-w-[90px] md:max-w-[110px]">
                  {top3[2].displayName}
                </p>
                <p className="text-[10px] text-gray-400 truncate max-w-[80px]">
                  {top3[2].clubName || 'Sem Clube'}
                </p>
                <div className="mt-2 w-full bg-amber-950/60 rounded-t-xl py-2 px-1 border-t-2 border-amber-700 text-center">
                  <span className="text-base md:text-lg font-black text-amber-200">
                    {currentCategory.getMetric(top3[2])}
                  </span>
                  <span className="block text-[9px] text-amber-300/80 uppercase font-bold">
                    {currentCategory.metricLabel}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LEADERBOARD TABLE (Complete Ranking List)
          ========================================================================= */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        {/* Table Title Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentCategory.badge}</span>
            <div>
              <h3 className="font-black text-gray-900 text-sm md:text-base">
                {currentCategory.label}
              </h3>
              <p className="text-[10px] text-gray-400">
                {selectedLeague === 'all' 
                  ? (lang === 'pt' ? 'Todas as competições' : 'All competitions')
                  : `Liga: ${selectedLeague}`}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {sortedPlayers.length} {lang === 'pt' ? 'jogadores' : 'players'}
          </span>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-100/60 text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider">
          <div className="col-span-1 text-center">Pos</div>
          <div className="col-span-6 md:col-span-5">Jogador & Clube</div>
          <div className="col-span-2 text-center">Jogos</div>
          {activeTab === 'performance' ? (
            <>
              <div className="col-span-3 md:col-span-4 text-right pr-2">Nota / Pontos</div>
            </>
          ) : activeTab === 'ga' ? (
            <>
              <div className="col-span-3 md:col-span-4 text-right pr-2">G + A (Total)</div>
            </>
          ) : (
            <>
              <div className="col-span-3 md:col-span-4 text-right pr-2">{currentCategory.metricLabel}</div>
            </>
          )}
        </div>

        {/* Rows */}
        {sortedPlayers.length === 0 ? (
          <div className="p-8 text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center text-xl text-gray-400">
              ⚽
            </div>
            <p className="text-sm font-black text-gray-700">
              {lang === 'pt' 
                ? activeTab === 'scorers' 
                  ? 'Nenhum artilheiro com golos registrados nesta categoria ainda.' 
                  : 'Nenhum jogador com dados registrados nesta categoria ainda.'
                : 'No players with recorded stats in this category yet.'}
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {lang === 'pt' 
                ? 'Os utilizadores cadastrados no app não entram automaticamente na artilharia. Os artilheiros surgem quando há golos marcados em partidas ou quando são adicionados diretamente pelo botão "+ Adicionar Artilheiro" a partir dos jogadores dos clubes.' 
                : 'Registered app users do not automatically enter the top scorers list. Scorers appear when goals are scored in matches or when added directly from club rosters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedPlayers.map((player, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              return (
                <div
                  key={player.uid}
                  onClick={() => onPlayerClick(players.find(u => u.uid === player.uid) || player)}
                  className="grid grid-cols-12 items-center px-4 py-3 hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                >
                  {/* Rank Position */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
                      rank === 1 ? "bg-amber-100 text-amber-800 border border-amber-300" :
                      rank === 2 ? "bg-slate-200 text-slate-800 border border-slate-300" :
                      rank === 3 ? "bg-amber-800/10 text-amber-900 border border-amber-800/20" :
                      "text-gray-400 font-bold"
                    )}>
                      {rank}
                    </span>
                  </div>

                  {/* Player and Club Info */}
                  <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0 pr-2">
                    <div className="relative shrink-0">
                      {player.photoURL ? (
                        <img
                          src={player.photoURL}
                          alt={player.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 group-hover:border-emerald-500 transition-colors"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                          {player.displayName[0]}
                        </div>
                      )}
                      {player.clubLogo && (
                        <img
                          src={player.clubLogo}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover absolute -bottom-0.5 -right-0.5 border border-white shadow-xs"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                          {player.displayName}
                        </span>
                        {player.isManual && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[9px] font-black uppercase tracking-wider border border-amber-200 shrink-0">
                            ⚽ {lang === 'pt' ? 'Artilheiro' : 'Recorded'}
                          </span>
                        )}
                        {player.motmCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-50 text-amber-700 rounded text-[9px] font-bold shrink-0">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                            {player.motmCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 truncate">
                        {player.clubName ? (
                          <span className="font-semibold text-emerald-600 truncate">{player.clubName}</span>
                        ) : (
                          <span className="truncate italic">Sem clube</span>
                        )}
                        {player.league && (
                          <>
                            <span>·</span>
                            <span className="text-gray-400 truncate">{player.league}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Matches Played */}
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-bold text-gray-700">{player.matchesPlayed}</span>
                    <span className="block text-[8px] text-gray-400 uppercase font-mono">jogos</span>
                  </div>

                  {/* Main Metric Column */}
                  <div className="col-span-3 md:col-span-4 text-right pr-2 flex items-center justify-end gap-2">
                    <div>
                      {activeTab === 'scorers' && (
                        <div>
                          <span className="text-base font-black text-emerald-700">{player.goals}</span>
                          <span className="text-[10px] text-gray-400 font-semibold block">{player.goalsPerMatch} G/J</span>
                        </div>
                      )}

                      {activeTab === 'assists' && (
                        <div>
                          <span className="text-base font-black text-blue-700">{player.assists}</span>
                          <span className="text-[10px] text-gray-400 font-semibold block">{player.assistsPerMatch} A/J</span>
                        </div>
                      )}

                      {activeTab === 'ga' && (
                        <div>
                          <span className="text-base font-black text-emerald-800">{player.ga}</span>
                          <span className="text-[10px] text-gray-400 font-semibold block">
                            {player.goals}G · {player.assists}A
                          </span>
                        </div>
                      )}

                      {activeTab === 'performance' && (
                        <div>
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black">
                              ★ {player.performanceIndex}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                            {player.performancePoints} pts · {player.ga} G+A
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Delete button if this is a manual entry and current user is owner or admin */}
                    {player.isManual && player.manualId && onDeleteManualScorer && (isAdmin || (currentUser && player.createdBy === currentUser.uid)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(lang === 'pt' ? `Remover ${player.displayName} da artilharia?` : `Remove ${player.displayName}?`)) {
                            onDeleteManualScorer(player.manualId!);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title={lang === 'pt' ? 'Remover registro' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          INDIVIDUAL PERFORMANCE SUMMARY HIGHLIGHT (Resumo Geral)
          ========================================================================= */}
      {activeTab === 'performance' && sortedPlayers.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 p-5 rounded-3xl border border-emerald-200/60 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-700" />
            <h4 className="font-black text-emerald-950 text-sm">
              {lang === 'pt' ? 'Como é calculado o Desempenho Individual?' : 'How is Individual Performance calculated?'}
            </h4>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed">
            {lang === 'pt'
              ? 'O Índice de Desempenho combina o impacto real em campo (Gols com 4 pts, Assistências com 3 pts, Craque do Jogo com 6 pts, Presenças em campo com 2 pts) e a média dos atributos técnicos individuais (Defesa, Passe e Finalização). O resultado gera a nota oficial BeSoccer de 1.0 a 10.0.'
              : 'The Performance Index aggregates on-pitch impact (Goals 4pts, Assists 3pts, Man of the Match 6pts, Match appearances 2pts) combined with individual technical ratings (Defense, Passing, Finishing), generating the official BeSoccer rating from 1.0 to 10.0.'}
          </p>
        </div>
      )}

      {/* =========================================================================
          ADD TOP SCORER MODAL (Adicionar Jogador com mais gols)
          ========================================================================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-t-[32px] md:rounded-[32px] p-6 max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-gray-950 flex items-center justify-center font-black shadow-sm">
                    <Trophy className="w-5 h-5 fill-gray-950" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">
                      {lang === 'pt' ? 'Adicionar Artilheiro' : 'Add Top Scorer'}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {lang === 'pt' ? 'Informe o nome do jogador e a contagem de gols' : 'Enter player name and goal tally'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!scorerName.trim()) {
                    setScorerError(lang === 'pt' ? 'Nome do jogador é obrigatório.' : 'Player name is required.');
                    return;
                  }
                  const goalsNum = parseInt(scorerGoals, 10);
                  if (isNaN(goalsNum) || goalsNum < 0) {
                    setScorerError(lang === 'pt' ? 'Por favor insira uma quantidade válida de gols.' : 'Please enter a valid goal count.');
                    return;
                  }

                  if (!onSaveManualScorer) return;

                  try {
                    setIsSavingScorer(true);
                    setScorerError(null);
                    const selectedClubObj = clubs.find(c => c.name === scorerClub);
                    await onSaveManualScorer({
                      playerName: scorerName.trim(),
                      goals: goalsNum,
                      assists: scorerAssists ? parseInt(scorerAssists, 10) || 0 : 0,
                      motmCount: scorerMotm ? parseInt(scorerMotm, 10) || 0 : 0,
                      clubName: scorerClub.trim() || undefined,
                      clubLogoURL: selectedClubObj?.logoURL || undefined,
                      league: scorerLeague.trim() || undefined,
                      photoURL: scorerPhoto.trim() || undefined,
                      matchesPlayed: scorerMatches ? parseInt(scorerMatches, 10) || 1 : undefined,
                      createdBy: currentUser?.uid,
                      createdByName: currentUser?.displayName,
                    });
                    setIsAddModalOpen(false);
                    setScorerName('');
                    setScorerGoals('');
                    setScorerAssists('');
                    setScorerMotm('');
                    setScorerClub('');
                    setScorerLeague('');
                    setScorerPhoto('');
                    setScorerMatches('');
                  } catch (err) {
                    console.error(err);
                    setScorerError(lang === 'pt' ? 'Erro ao salvar artilheiro.' : 'Failed to save scorer.');
                  } finally {
                    setIsSavingScorer(false);
                  }
                }}
                className="space-y-4 pt-4"
              >
                {scorerError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{scorerError}</span>
                  </div>
                )}

                {/* CLUB PLAYERS QUICK PICKER: Must start from players added to clubs */}
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={14} className="text-emerald-700" />
                      <span>{lang === 'pt' ? 'Escolher dos Jogadores dos Clubes' : 'Pick from Club Players'}</span>
                    </label>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      {clubRosterPlayers.length} {lang === 'pt' ? 'no plantel' : 'in roster'}
                    </span>
                  </div>

                  {/* Filter by Club and Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={selectedClubFilterForRoster}
                      onChange={(e) => setSelectedClubFilterForRoster(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
                    >
                      <option value="">{lang === 'pt' ? 'Todos os Clubes' : 'All Clubs'}</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder={lang === 'pt' ? 'Filtrar jogador...' : 'Search player...'}
                        value={clubPlayerSearch}
                        onChange={(e) => setClubPlayerSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Quick-select Player Cards */}
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {filteredRosterOptions.length === 0 ? (
                      <div className="text-[11px] text-gray-500 italic p-2 text-center bg-white/60 rounded-xl border border-dashed border-emerald-200">
                        {lang === 'pt'
                          ? 'Nenhum jogador encontrado com este filtro. Adicione jogadores nos Clubes ou digite o nome abaixo.'
                          : 'No club players found. Add players in Clubs or type name below.'}
                      </div>
                    ) : (
                      filteredRosterOptions.slice(0, 20).map(cp => {
                        const isSelected = scorerName.trim().toLowerCase() === cp.name.toLowerCase();
                        return (
                          <button
                            key={cp.id}
                            type="button"
                            onClick={() => {
                              setScorerName(cp.name);
                              setScorerClub(cp.clubName);
                              if (cp.clubLeague) setScorerLeague(cp.clubLeague);
                              if (cp.photoURL) setScorerPhoto(cp.photoURL);
                            }}
                            className={cn(
                              "w-full text-left p-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-xs",
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold"
                                : "bg-white hover:bg-emerald-100/60 text-gray-800 border-gray-200"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {cp.number ? `#${cp.number}` : cp.name[0]}
                              </div>
                              <div className="truncate">
                                <span className="font-extrabold">{cp.name}</span>
                                {cp.position && <span className="text-[10px] opacity-75 ml-1 font-mono">({cp.position})</span>}
                              </div>
                            </div>
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full shrink-0 font-bold",
                              isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                            )}>
                              {cp.clubName}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Player Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {lang === 'pt' ? 'Nome do Jogador Selecionado *' : 'Selected Player Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={scorerName}
                    onChange={(e) => setScorerName(e.target.value)}
                    placeholder={lang === 'pt' ? 'Nome do jogador (ou clique acima na lista dos clubes)...' : 'Player name...'}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-gray-900"
                    maxLength={80}
                  />
                </div>

                {/* Goals, Assists and MOTM/MVP row */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                      {lang === 'pt' ? 'Golos *' : 'Goals *'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={scorerGoals}
                        onChange={(e) => setScorerGoals(e.target.value)}
                        placeholder="Ex: 12"
                        className="w-full px-3 py-2 rounded-xl border-2 border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-black text-emerald-800 bg-emerald-50/30"
                      />
                      <span className="absolute right-2.5 top-2 text-xs">⚽</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                      {lang === 'pt' ? 'Assistências' : 'Assists'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={scorerAssists}
                        onChange={(e) => setScorerAssists(e.target.value)}
                        placeholder="Ex: 5"
                        className="w-full px-3 py-2 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-bold text-gray-900 bg-blue-50/20"
                      />
                      <span className="absolute right-2.5 top-2 text-xs">👟</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                      {lang === 'pt' ? 'MVP / Craque' : 'MVP Awards'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={scorerMotm}
                        onChange={(e) => setScorerMotm(e.target.value)}
                        placeholder="Ex: 2"
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base font-bold text-gray-900 bg-amber-50/20"
                      />
                      <span className="absolute right-2.5 top-2 text-xs">🏆</span>
                    </div>
                  </div>
                </div>

                {/* Club / Team selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {lang === 'pt' ? 'Clube / Time do Jogador' : 'Club / Team'}
                  </label>
                  <div className="space-y-2">
                    {clubs.length > 0 && (
                      <select
                        value={scorerClub}
                        onChange={(e) => setScorerClub(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white"
                      >
                        <option value="">{lang === 'pt' ? '--- Selecionar dos Clubes Cadastrados ---' : '--- Select Existing Club ---'}</option>
                        {clubs.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={scorerClub}
                      onChange={(e) => setScorerClub(e.target.value)}
                      placeholder={lang === 'pt' ? 'Ou digite o nome do clube...' : 'Or enter club name...'}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-gray-800"
                    />
                  </div>
                </div>

                {/* Championship / League */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {lang === 'pt' ? 'Campeonato / Liga' : 'League / Championship'}
                  </label>
                  <div className="space-y-2">
                    {availableLeagues.length > 0 && (
                      <select
                        value={scorerLeague}
                        onChange={(e) => setScorerLeague(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white"
                      >
                        <option value="">{lang === 'pt' ? 'Geral / Liga do Bairro' : 'General / Neighborhood League'}</option>
                        {availableLeagues.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={scorerLeague}
                      onChange={(e) => setScorerLeague(e.target.value)}
                      placeholder={lang === 'pt' ? 'Ou digite o nome do campeonato...' : 'Or enter tournament name...'}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-gray-800"
                    />
                  </div>
                </div>

                {/* Player Photo (via ImageUploadPicker) */}
                <div>
                  <ImageUploadPicker
                    label={lang === 'pt' ? 'Foto do Jogador' : 'Player Photo'}
                    value={scorerPhoto}
                    onChange={setScorerPhoto}
                    placeholderLetter={scorerName ? scorerName[0].toUpperCase() : '⚽'}
                    helperText={lang === 'pt' ? 'Carregue da sua galeria ou escolha imagem' : 'Upload from gallery or device'}
                    lang={lang}
                  />
                </div>

                {/* Matches Played */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {lang === 'pt' ? 'Partidas Jogadas (Opcional)' : 'Matches Played (Optional)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={scorerMatches}
                    onChange={(e) => setScorerMatches(e.target.value)}
                    placeholder="Ex: 8"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-gray-800"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingScorer}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSavingScorer ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 fill-white" />
                        <span>{lang === 'pt' ? 'Salvar Artilheiro' : 'Save Top Scorer'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
