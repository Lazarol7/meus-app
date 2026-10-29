import React, { useState, useMemo } from 'react';
import { Match, Registration, MatchStats, UserProfile, Transfer, Club, ManualScorer, CommunityAd, CommunityLeague, LiveTicket } from '../types';
import { LANGUAGES, Language } from '../constants';
import { format, isSameDay, addDays, startOfDay } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { 
  Shield, Calendar, MapPin, Users, Trophy, DollarSign, 
  Search, Bell, Plus, ChevronRight, ArrowRight,
  Star, X, Zap, Flame, Award, Video, Megaphone, Phone, MessageCircle, Building2, Radio
} from 'lucide-react';
import { cn } from '../lib/utils';
import stadiumBannerImg from '../assets/images/besoccer_stadium_banner_1792625912137.jpg';
import { LiveMatchesHubModal } from './LiveMatchesHubModal';

interface BeSoccerHomeProps {
  user: UserProfile;
  matches: Match[];
  registrations: Registration[];
  stats: MatchStats[];
  allUsers: UserProfile[];
  transfers: Transfer[];
  clubs: Club[];
  manualScorers?: ManualScorer[];
  communityAds?: CommunityAd[];
  communityLeagues?: CommunityLeague[];
  tickets?: LiveTicket[];
  lang: Language;
  onSelectMatch: (matchId: string) => void;
  onCreateMatch: () => void;
  onViewAllMatches: () => void;
  onViewStats: () => void;
  onViewClubs: () => void;
  onOpenAds?: () => void;
  onOpenLicenses?: () => void;
  onPlayerClick?: (player: UserProfile) => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

export function BeSoccerHome({
  user,
  matches,
  registrations,
  stats,
  allUsers,
  transfers,
  clubs,
  manualScorers = [],
  communityAds = [],
  communityLeagues = [],
  tickets = [],
  lang,
  onSelectMatch,
  onCreateMatch,
  onViewAllMatches,
  onViewStats,
  onViewClubs,
  onOpenAds,
  onOpenLicenses,
  onPlayerClick,
  unreadNotificationsCount = 0,
  onOpenNotifications,
}: BeSoccerHomeProps) {
  const t = LANGUAGES[lang];
  const dateLocale = lang === 'pt' ? ptBR : enUS;

  // Active live match streams
  const liveMatches = useMemo(() => {
    return matches.filter(m => m.liveStream?.isLive);
  }, [matches]);

  const [showLiveHubModal, setShowLiveHubModal] = useState(false);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [matchStatusFilter, setMatchStatusFilter] = useState<'all' | 'live' | 'open' | 'finished' | 'mine'>('all');
  
  // Date strip selection (default is today)
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);

  // Generate 7-day ribbon around today (-2 to +5 days)
  const dateRibbon = useMemo(() => {
    const days: Date[] = [];
    for (let i = -2; i <= 5; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, [today]);

  // Featured match (either live, or closest upcoming open match, or most recent finished)
  const featuredMatch = useMemo(() => {
    if (matches.length === 0) return null;
    const now = Date.now();
    // First priority: open match today or closest in the future
    const upcoming = [...matches]
      .filter(m => m.status === 'open' && m.date >= now - 3600000 * 2)
      .sort((a, b) => a.date - b.date);
    if (upcoming.length > 0) return upcoming[0];

    // Second: any open match
    const anyOpen = matches.find(m => m.status === 'open');
    if (anyOpen) return anyOpen;

    // Otherwise most recent match
    return [...matches].sort((a, b) => b.date - a.date)[0];
  }, [matches]);

  // Filtered matches based on date, status, and search query
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesAddress = match.location.address.toLowerCase().includes(query);
        const matchesTeamA = match.teamAName?.toLowerCase().includes(query);
        const matchesTeamB = match.teamBName?.toLowerCase().includes(query);
        const matchesDesc = match.description?.toLowerCase().includes(query);
        if (!matchesAddress && !matchesTeamA && !matchesTeamB && !matchesDesc) {
          return false;
        }
      }

      // 2. Date Filter (if a specific date is selected)
      if (selectedDate) {
        if (!isSameDay(new Date(match.date), selectedDate)) {
          return false;
        }
      }

      // 3. Status Filter
      if (matchStatusFilter === 'live') {
        const isLiveOrToday = isSameDay(new Date(match.date), today) && match.status === 'open';
        return isLiveOrToday;
      }
      if (matchStatusFilter === 'open') {
        return match.status === 'open';
      }
      if (matchStatusFilter === 'finished') {
        return match.status === 'finished';
      }
      if (matchStatusFilter === 'mine') {
        const userRegs = registrations.filter(r => r.userId === user.uid).map(r => r.matchId);
        return userRegs.includes(match.id) || match.organizerId === user.uid;
      }

      return true;
    }).sort((a, b) => b.date - a.date);
  }, [matches, searchQuery, selectedDate, matchStatusFilter, registrations, user.uid, today]);

  // State for home leaderboard category tab
  const [homeLeaderboardTab, setHomeLeaderboardTab] = useState<'scorers' | 'assists' | 'ga' | 'mvp'>('scorers');

  // Group players for leaderboard by active tab (including manual top scorers)
  const topPlayers = useMemo(() => {
    // 1. Process regular registered players ONLY if they actually have match statistics
    // (Never place registered users automatically into artilharia if they have 0 goals/stats)
    const regularPlayers = allUsers
      .map(p => {
        const pStats = stats.filter(s => s.playerId === p.uid);
        const goals = pStats.reduce((acc, s) => acc + (s.goals || 0), 0);
        const assists = pStats.reduce((acc, s) => acc + (s.assists || 0), 0);
        const motm = pStats.filter(s => s.isMOTM).length;
        const ga = goals + assists;
        const totalScore = (goals * 4) + (assists * 3) + (motm * 6);
        return {
          ...p,
          goals,
          assists,
          ga,
          motm,
          totalScore,
          matchesPlayed: pStats.length,
          isManual: false,
        };
      })
      .filter(p => p.goals > 0 || p.assists > 0 || p.matchesPlayed > 0 || p.motm > 0);

    const manualList = manualScorers.map(m => {
      const goals = m.goals || 0;
      const assists = m.assists || 0;
      const ga = goals + assists;
      const totalScore = (goals * 4) + (assists * 3);
      return {
        uid: `manual_${m.id}`,
        displayName: m.playerName,
        email: '',
        ratings: { defense: 3, passing: 4, finishing: 5 } as UserProfile['ratings'],
        language: 'pt' as const,
        createdAt: m.createdAt,
        clubName: m.clubName,
        clubLogoURL: m.clubLogoURL,
        photoURL: m.photoURL,
        goals,
        assists,
        ga,
        motm: 0,
        totalScore,
        matchesPlayed: m.matchesPlayed || (goals > 0 ? Math.max(1, Math.ceil(goals / 1.5)) : 1),
        isManual: true,
      };
    });

    const combined = [...regularPlayers, ...manualList];
    let filteredList = combined;

    if (homeLeaderboardTab === 'scorers') {
      filteredList = combined.filter(p => p.goals > 0);
    } else if (homeLeaderboardTab === 'assists') {
      filteredList = combined.filter(p => p.assists > 0);
    } else if (homeLeaderboardTab === 'ga') {
      filteredList = combined.filter(p => p.ga > 0);
    } else {
      filteredList = combined.filter(p => p.matchesPlayed > 0 || p.motm > 0 || p.totalScore > 0);
    }

    return filteredList
      .sort((a, b) => {
        if (homeLeaderboardTab === 'scorers') {
          if (b.goals !== a.goals) return b.goals - a.goals;
          return b.assists - a.assists;
        }
        if (homeLeaderboardTab === 'assists') {
          if (b.assists !== a.assists) return b.assists - a.assists;
          return b.goals - a.goals;
        }
        if (homeLeaderboardTab === 'ga') {
          if (b.ga !== a.ga) return b.ga - a.ga;
          return b.goals - a.goals;
        }
        // 'mvp'
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return b.motm - a.motm;
      })
      .slice(0, 5);
  }, [allUsers, stats, manualScorers, homeLeaderboardTab]);

  // Helper for club emblem
  const getClubLogo = (clubName?: string) => {
    if (!clubName) return null;
    const found = clubs.find(c => c.name.toLowerCase() === clubName.toLowerCase());
    return found?.logoURL;
  };

  return (
    <div className="space-y-6">
      {/* LIVE STREAM ALERT BANNER (Transmissão Ao Vivo) */}
      {liveMatches.length > 0 && (
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-800 text-white rounded-3xl p-5 shadow-2xl border border-rose-400/40 space-y-3 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center shrink-0 text-white shadow-inner">
                <Video className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-white text-rose-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    {liveMatches.length > 1 ? `${liveMatches.length} JOGOS SIMULTÂNEOS EM DIRETO` : 'EM DIRETO AGORA'}
                  </span>
                  <span className="text-xs text-rose-200 font-mono">
                    👥 {liveMatches.reduce((acc, m) => acc + (m.liveStream?.viewerCount || 0), 0)} a assistir
                  </span>
                </div>
                <h3 className="font-black text-base md:text-lg text-white mt-1">
                  {liveMatches.length > 1
                    ? 'Há múltiplas partidas sendo filmadas ao vivo! Escolha qual quer assistir.'
                    : `${liveMatches[0].teamAName || 'Equipa A'} vs ${liveMatches[0].teamBName || 'Equipa B'}`}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {liveMatches.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setShowLiveHubModal(true)}
                  className="px-5 py-2.5 bg-white text-rose-800 hover:bg-rose-50 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Radio size={14} className="text-rose-600" />
                  <span>Escolher Qual Jogo Assistir ({liveMatches.length})</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectMatch(liveMatches[0].id)}
                  className="px-5 py-2.5 bg-white text-rose-800 hover:bg-rose-50 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Assistir Live do Jogo</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Match Selection Pills if multiple simultaneous lives */}
          {liveMatches.length > 1 && (
            <div className="pt-2 border-t border-white/15 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-rose-200 shrink-0">Escolha rápida:</span>
              {liveMatches.map((lm) => (
                <button
                  key={lm.id}
                  type="button"
                  onClick={() => onSelectMatch(lm.id)}
                  className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer"
                >
                  <span className="truncate">{lm.teamAName || 'A'} vs {lm.teamBName || 'B'}</span>
                  <span className="text-[10px] font-mono bg-rose-500/80 px-1.5 py-0.5 rounded-md">
                    {lm.scoreA ?? 0}:{lm.scoreB ?? 0}
                  </span>
                  <span className="text-[10px] text-rose-300">
                    👥 {lm.liveStream?.viewerCount || 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          BESOCCER BRANDED TOP HEADER
          ========================================================================= */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle pitch pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Brand & Greeting */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <Shield className="w-7 h-7 fill-emerald-400/30 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
                  Be-Lwezer · Bairro Edition
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  <Flame size={11} className="text-amber-400" />
                  {matches.filter(m => m.status === 'open').length} {lang === 'pt' ? 'Jogos Abertos' : 'Open Matches'}
                </span>
                {(user.role === 'admin' || user.email === 'lazaroatalia80@gmail.com' || user.email === 'lazaratala80@gmail.com') && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 border border-amber-300 shadow-md">
                    👑 ADMIN (TUDO GRÁTIS)
                  </span>
                )}
              </div>
              {/* User requested: "Onde vem olá Lázaro deve vir Bem-vindo" */}
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
                {lang === 'pt' ? `Bem-vindo, ${user.displayName ? user.displayName.split(' ')[0] : 'Craque'}!` : `Welcome, ${user.displayName ? user.displayName.split(' ')[0] : 'Player'}!`}
              </h1>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={cn(
                "p-2.5 rounded-2xl transition-all cursor-pointer border",
                isSearchOpen 
                  ? "bg-white text-emerald-900 border-white shadow-md" 
                  : "bg-white/10 text-white hover:bg-white/20 border-white/15"
              )}
              title={lang === 'pt' ? 'Pesquisar Jogos' : 'Search Matches'}
            >
              <Search size={18} />
            </button>

            {/* Notifications Trigger */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2.5 rounded-2xl bg-white/10 text-white hover:bg-white/20 border border-white/15 transition-all cursor-pointer"
                title={lang === 'pt' ? 'Notificações' : 'Notifications'}
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-emerald-800 shadow-sm animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Create Match CTA */}
            <button
              onClick={onCreateMatch}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/30 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>{lang === 'pt' ? 'Criar Jogo' : 'New Match'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Search Bar */}
        {isSearchOpen && (
          <div className="relative mt-4 pt-3 border-t border-white/10 animate-fade-in">
            <Search className="w-4 h-4 text-emerald-200 absolute left-3 top-6" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'pt' ? 'Pesquisar por equipa, campo, bairro ou jogador...' : 'Search by team, field, or player...'}
              className="w-full bg-white/15 border border-white/25 text-white placeholder-emerald-200/70 rounded-2xl pl-10 pr-10 py-2.5 text-sm outline-none focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-6 text-white/70 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          BESOCCER MATCHDAY DATE SCROLLER (Barra de Datas BeSoccer)
          ========================================================================= */}
      <div className="bg-white rounded-2xl p-2.5 border border-black/5 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-500">
            <Calendar size={13} className="text-emerald-600" />
            <span>{lang === 'pt' ? 'Calendário de Jogos' : 'Matchday Calendar'}</span>
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
            >
              {lang === 'pt' ? 'Ver Todos os Dias' : 'View All Days'}
            </button>
          )}
        </div>

        {/* Horizontal ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {dateRibbon.map((dayDate, idx) => {
            const isToday = isSameDay(dayDate, today);
            const isSelected = selectedDate ? isSameDay(dayDate, selectedDate) : false;
            
            // Check if there are matches on this day
            const matchesOnDay = matches.filter(m => isSameDay(new Date(m.date), dayDate)).length;

            let dayLabel = format(dayDate, 'EEE', { locale: dateLocale }).toUpperCase().slice(0, 3);
            if (isToday) dayLabel = lang === 'pt' ? 'HOJE' : 'TODAY';

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(isSelected ? null : dayDate)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[62px] py-2 px-2.5 rounded-xl transition-all cursor-pointer relative shrink-0",
                  isSelected
                    ? "bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/25 scale-102"
                    : isToday
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium border border-gray-100"
                )}
              >
                <span className="text-[10px] tracking-tight opacity-90">{dayLabel}</span>
                <span className="text-base font-black leading-none mt-1">{format(dayDate, 'd')}</span>
                
                {matchesOnDay > 0 && (
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.2 rounded-full mt-1 leading-none",
                    isSelected ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"
                  )}>
                    {matchesOnDay}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          BESOCCER STATUS FILTER TABS (Segmented Control)
          ========================================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: lang === 'pt' ? 'Todos os Jogos' : 'All Matches', count: matches.length },
          { id: 'open', label: lang === 'pt' ? 'Inscrições Abertas' : 'Open', count: matches.filter(m => m.status === 'open').length },
          { id: 'live', label: lang === 'pt' ? 'Hoje / Em Directo' : 'Live / Today', count: matches.filter(m => isSameDay(new Date(m.date), today)).length },
          { id: 'finished', label: lang === 'pt' ? 'Resultados' : 'Finished', count: matches.filter(m => m.status === 'finished').length },
          { id: 'mine', label: lang === 'pt' ? 'Os Meus Jogos' : 'My Matches', count: registrations.filter(r => r.userId === user.uid).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMatchStatusFilter(tab.id as any)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
              matchStatusFilter === tab.id
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-black/5"
            )}
          >
            <span>{tab.label}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-black",
              matchStatusFilter === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* =========================================================================
          BESOCCER FEATURED SUPER MATCH (Partida em Destaque)
          ========================================================================= */}
      {featuredMatch && (
        <div 
          onClick={() => onSelectMatch(featuredMatch.id)}
          className="relative bg-neutral-900 rounded-3xl overflow-hidden shadow-xl border border-black/10 cursor-pointer group hover:scale-[1.01] transition-all"
        >
          {/* Stadium Photo Backdrop with rich dark gradient scrim */}
          <div className="absolute inset-0">
            <img 
              src={stadiumBannerImg} 
              alt="Stadium Matchday" 
              className="w-full h-full object-cover opacity-45 group-hover:opacity-55 transition-opacity duration-300" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-emerald-950/50" />
          </div>

          <div className="relative z-10 p-5 md:p-6 text-white space-y-4">
            {/* Header Badge & Match Status */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md">
                <Trophy size={12} className="text-amber-400" />
                {lang === 'pt' ? 'Super Jogo do Bairro' : 'Featured Neighborhood Match'}
              </span>

              <div className="flex items-center gap-2">
                {featuredMatch.status === 'finished' ? (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {lang === 'pt' ? 'Terminado' : 'Final Score'}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    {lang === 'pt' ? 'Inscrições Abertas' : 'Open'}
                  </span>
                )}
              </div>
            </div>

            {/* Teams & Scoreboard (BeSoccer Match Center) */}
            <div className="grid grid-cols-7 items-center py-2">
              {/* Team A */}
              <div className="col-span-3 flex flex-col items-center text-center space-y-2">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-600/90 text-white flex items-center justify-center font-black text-xl shadow-lg border border-white/20">
                  {getClubLogo(featuredMatch.teamAName) ? (
                    <img 
                      src={getClubLogo(featuredMatch.teamAName)!} 
                      alt={featuredMatch.teamAName} 
                      className="w-full h-full object-cover rounded-2xl" 
                    />
                  ) : (
                    <Shield size={28} />
                  )}
                </div>
                <h3 className="font-black text-sm md:text-base leading-tight truncate max-w-full">
                  {featuredMatch.teamAName || (lang === 'pt' ? 'Equipa A' : 'Team A')}
                </h3>
              </div>

              {/* Center VS or Score */}
              <div className="col-span-1 flex flex-col items-center justify-center text-center">
                {featuredMatch.status === 'finished' ? (
                  <div className="bg-black/80 px-3 py-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
                    <span className="text-xl md:text-2xl font-black text-emerald-400 tabular-nums">
                      {featuredMatch.scoreA ?? 0} - {featuredMatch.scoreB ?? 0}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xs font-black text-emerald-300">
                      VS
                    </div>
                    <span className="text-[11px] font-bold text-gray-300 mt-1">
                      {format(featuredMatch.date, 'HH:mm')}
                    </span>
                  </div>
                )}
              </div>

              {/* Team B */}
              <div className="col-span-3 flex flex-col items-center text-center space-y-2">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-blue-600/90 text-white flex items-center justify-center font-black text-xl shadow-lg border border-white/20">
                  {getClubLogo(featuredMatch.teamBName) ? (
                    <img 
                      src={getClubLogo(featuredMatch.teamBName)!} 
                      alt={featuredMatch.teamBName} 
                      className="w-full h-full object-cover rounded-2xl" 
                    />
                  ) : (
                    <Shield size={28} />
                  )}
                </div>
                <h3 className="font-black text-sm md:text-base leading-tight truncate max-w-full">
                  {featuredMatch.teamBName || (lang === 'pt' ? 'Equipa B' : 'Team B')}
                </h3>
              </div>
            </div>

            {/* Match Meta: Location, Date & Player Spots */}
            <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-300">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <Calendar size={14} />
                  <span>{format(featuredMatch.date, "EEEE, d 'de' MMMM", { locale: dateLocale })}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">{featuredMatch.location.address}</span>
                </div>
              </div>

              {/* Spots & CTA */}
              <div className="flex items-center gap-3">
                <span className="text-emerald-300 font-black">
                  {registrations.filter(r => r.matchId === featuredMatch.id && r.status === 'confirmed').length} / {featuredMatch.maxPlayers} {lang === 'pt' ? 'Convocados' : 'Players'}
                </span>
                <span className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md transition-all">
                  <span>{lang === 'pt' ? 'Ver Ficha' : 'Details'}</span>
                  <ChevronRight size={14} />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESPONSIVE 2-COLUMN LAYOUT ON DESKTOP:
          Left: Fixtures List (BeSoccer Match Rows)
          Right: Standings & Transfers Sidebar
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Match Fixtures (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              {lang === 'pt' ? 'Partidas & Resultados' : 'Fixtures & Results'}
              <span className="text-xs font-bold text-gray-400">({filteredMatches.length})</span>
            </h2>
            <button
              onClick={onViewAllMatches}
              className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'pt' ? 'Ver Todas' : 'View All'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-black/5 shadow-xs space-y-3">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="font-bold text-gray-900">
                {lang === 'pt' ? 'Nenhuma partida encontrada' : 'No matches found'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {lang === 'pt' 
                  ? 'Não há jogos para o filtro ou dia selecionado. Experimenta selecionar outro dia ou cria um novo jogo!' 
                  : 'No matches found for this filter. Try another day or create a match!'}
              </p>
              <button
                onClick={onCreateMatch}
                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer"
              >
                <Plus size={14} />
                {lang === 'pt' ? 'Organizar Jogo' : 'Create Match'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map(match => {
                const matchRegs = registrations.filter(r => r.matchId === match.id);
                const confirmedCount = matchRegs.filter(r => r.status === 'confirmed').length;
                const isFull = confirmedCount >= match.maxPlayers;
                const isFinished = match.status === 'finished';

                return (
                  <div
                    key={match.id}
                    onClick={() => onSelectMatch(match.id)}
                    className="group bg-white rounded-2xl border border-black/5 p-4 shadow-xs hover:shadow-md hover:border-emerald-500/30 transition-all cursor-pointer space-y-3"
                  >
                    {/* Top Match League & Status Header */}
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-1.5 font-bold text-gray-500">
                        <Shield size={13} className="text-emerald-600" />
                        <span className="uppercase tracking-wider text-[11px]">
                          {lang === 'pt' ? 'Pelada do Bairro · Maputo' : 'Neighborhood League'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFinished ? (
                          <span className="text-[10px] font-black uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {lang === 'pt' ? 'Encerrado' : 'Finished'}
                          </span>
                        ) : isFull ? (
                          <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            {lang === 'pt' ? 'Lotado' : 'Full'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {match.maxPlayers - confirmedCount} {lang === 'pt' ? 'Vagas Abertas' : 'Spots Left'}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-emerald-600">
                          {match.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                        </span>
                      </div>
                    </div>

                    {/* Match Center: Team A vs Team B */}
                    <div className="grid grid-cols-7 items-center py-1">
                      {/* Team A */}
                      <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {getClubLogo(match.teamAName) ? (
                            <img src={getClubLogo(match.teamAName)!} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Shield size={16} />
                          )}
                        </div>
                        <span className="font-bold text-sm text-gray-900 truncate">
                          {match.teamAName || (lang === 'pt' ? 'Equipa A' : 'Team A')}
                        </span>
                      </div>

                      {/* Center Score / Time */}
                      <div className="col-span-1 flex flex-col items-center justify-center text-center">
                        {isFinished ? (
                          <span className="text-base font-black text-gray-900 tabular-nums bg-gray-100 px-2 py-1 rounded-lg">
                            {match.scoreA ?? 0} - {match.scoreB ?? 0}
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-emerald-700">
                              {format(match.date, 'HH:mm')}
                            </span>
                            <span className="text-[9px] text-gray-400 font-semibold">
                              {format(match.date, 'dd/MM')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="col-span-3 flex items-center justify-end gap-2.5 min-w-0">
                        <span className="font-bold text-sm text-gray-900 truncate text-right">
                          {match.teamBName || (lang === 'pt' ? 'Equipa B' : 'Team B')}
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {getClubLogo(match.teamBName) ? (
                            <img src={getClubLogo(match.teamBName)!} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Shield size={16} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Field & Avatars */}
                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{match.location.address}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {matchRegs.slice(0, 4).map((reg, idx) => (
                            <div 
                              key={reg.id} 
                              className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-bold text-gray-600"
                            >
                              {idx + 1}
                            </div>
                          ))}
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Standings & Transfers (Sidebar on lg) */}
        <div className="space-y-6">
          {/* =========================================================================
              BESOCCER LEADERBOARD / ARTILHEIROS DO BAIRRO
              ========================================================================= */}
          <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-gray-900 text-base">
                  {lang === 'pt' ? 'Craques do Bairro' : 'Top Scorers & MVPs'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onViewStats}
                  className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-950 bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                  title={lang === 'pt' ? 'Adicionar jogador e gols' : 'Add scorer'}
                >
                  <Plus size={12} strokeWidth={3} />
                  <span>{lang === 'pt' ? 'Artilheiro' : 'Add Scorer'}</span>
                </button>
                <button
                  onClick={onViewStats}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  {lang === 'pt' ? 'Ver Tabela' : 'Full Table'}
                </button>
              </div>
            </div>

            {/* Quick Category Switcher */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl text-center">
              <button
                type="button"
                onClick={() => setHomeLeaderboardTab('scorers')}
                className={cn(
                  "py-1.5 text-[10px] font-bold rounded-lg transition-all",
                  homeLeaderboardTab === 'scorers' 
                    ? "bg-white text-emerald-700 shadow-xs" 
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                ⚽ {lang === 'pt' ? 'Gols' : 'Goals'}
              </button>
              <button
                type="button"
                onClick={() => setHomeLeaderboardTab('assists')}
                className={cn(
                  "py-1.5 text-[10px] font-bold rounded-lg transition-all",
                  homeLeaderboardTab === 'assists' 
                    ? "bg-white text-blue-700 shadow-xs" 
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                🎯 {lang === 'pt' ? 'Garçons' : 'Assists'}
              </button>
              <button
                type="button"
                onClick={() => setHomeLeaderboardTab('ga')}
                className={cn(
                  "py-1.5 text-[10px] font-bold rounded-lg transition-all",
                  homeLeaderboardTab === 'ga' 
                    ? "bg-white text-emerald-800 shadow-xs" 
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                ⚡ G+A
              </button>
              <button
                type="button"
                onClick={() => setHomeLeaderboardTab('mvp')}
                className={cn(
                  "py-1.5 text-[10px] font-bold rounded-lg transition-all",
                  homeLeaderboardTab === 'mvp' 
                    ? "bg-white text-amber-700 shadow-xs" 
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                🌟 MVP
              </button>
            </div>

            {topPlayers.length === 0 ? (
              <div className="py-6 px-4 text-center space-y-1.5 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 my-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-sm">
                  ⚽
                </div>
                <p className="text-xs font-bold text-gray-700">
                  {lang === 'pt' ? 'Nenhum registo nesta categoria ainda' : 'No stats recorded yet'}
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  {lang === 'pt' 
                    ? 'Apenas jogadores com golos marcados ou dados de partidas aparecem no ranking.'
                    : 'Only players with recorded match goals or stats appear in the ranking.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topPlayers.map((player, idx) => (
                <div
                  key={player.uid}
                  onClick={() => onPlayerClick && onPlayerClick(player)}
                  className="py-2.5 flex items-center justify-between hover:bg-gray-50 rounded-xl px-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-black",
                      idx === 0 ? "bg-amber-100 text-amber-700" :
                      idx === 1 ? "bg-gray-200 text-gray-700" :
                      idx === 2 ? "bg-amber-800/10 text-amber-800" : "text-gray-400"
                    )}>
                      {idx + 1}
                    </span>

                    {player.photoURL ? (
                      <img 
                        src={player.photoURL} 
                        alt={player.displayName} 
                        className="w-8 h-8 rounded-full object-cover border border-emerald-100 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {player.displayName[0]}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{player.displayName}</p>
                        {(player as any).isManual && (
                          <span className="text-[8px] font-black uppercase text-amber-900 bg-amber-100 px-1 py-0.2 rounded shrink-0">
                            ⚽ {lang === 'pt' ? 'Artilheiro' : 'Manual'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">{player.clubName || 'Peladeiro Livre'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right shrink-0">
                    {homeLeaderboardTab === 'scorers' && (
                      <div>
                        <span className="text-xs font-black text-emerald-600 tabular-nums">
                          {player.goals} {lang === 'pt' ? 'Golos' : 'G'}
                        </span>
                        <p className="text-[10px] text-gray-400 font-semibold">{player.assists} Ast</p>
                      </div>
                    )}
                    {homeLeaderboardTab === 'assists' && (
                      <div>
                        <span className="text-xs font-black text-blue-600 tabular-nums">
                          {player.assists} {lang === 'pt' ? 'Passes' : 'Ast'}
                        </span>
                        <p className="text-[10px] text-gray-400 font-semibold">{player.goals} Golos</p>
                      </div>
                    )}
                    {homeLeaderboardTab === 'ga' && (
                      <div>
                        <span className="text-xs font-black text-emerald-700 tabular-nums">
                          {player.ga} G+A
                        </span>
                        <p className="text-[10px] text-gray-400 font-semibold">{player.goals}G · {player.assists}A</p>
                      </div>
                    )}
                    {homeLeaderboardTab === 'mvp' && (
                      <div>
                        <span className="text-xs font-black text-amber-600 tabular-nums">
                          {player.totalScore} pts
                        </span>
                        <p className="text-[10px] text-gray-400 font-semibold">{player.motm} MOTM</p>
                      </div>
                    )}
                    {player.motm > 0 && homeLeaderboardTab !== 'mvp' && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                        <Star size={10} className="fill-amber-400 text-amber-500" />
                        {player.motm}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* =========================================================================
              BESOCCER TRANSFER MARKET FEED (Mercado de Transferências)
              ========================================================================= */}
          <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-gray-900 text-base">
                  {lang === 'pt' ? 'Mercado de Transferências' : 'Transfer Market'}
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {lang === 'pt' ? 'Confirmadas' : 'Official'}
              </span>
            </div>

            {transfers.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">
                {lang === 'pt' ? 'Sem transferências registadas recentemente.' : 'No recent transfers.'}
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {transfers.slice(0, 5).map(transfer => (
                  <div key={transfer.id} className="py-2.5 flex items-center gap-3">
                    {transfer.playerPhoto ? (
                      <img 
                        src={transfer.playerPhoto} 
                        alt={transfer.playerName} 
                        className="w-9 h-9 rounded-full object-cover border border-emerald-100 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {transfer.playerName[0]}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{transfer.playerName}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                        <span className="truncate text-gray-400">{transfer.fromClub || 'Sem Clube'}</span>
                        <ArrowRight size={11} className="text-emerald-600 shrink-0" />
                        <span className="font-bold text-emerald-600 truncate">{transfer.toClub}</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-gray-400 shrink-0">
                      {format(transfer.date, 'd MMM')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              CLUBS SPOTLIGHT (Clubes do Bairro)
              ========================================================================= */}
          {clubs.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-1.5">
                  <Shield size={16} className="text-emerald-600" />
                  {lang === 'pt' ? 'Clubes Registados' : 'Clubs'}
                </h3>
                <button
                  onClick={onViewClubs}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  {lang === 'pt' ? 'Ver Todos' : 'View All'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {clubs.slice(0, 4).map(c => (
                  <div
                    key={c.id}
                    onClick={onViewClubs}
                    className="p-3 bg-gray-50 hover:bg-emerald-50/50 rounded-2xl border border-gray-100 transition-colors cursor-pointer text-center space-y-1.5"
                  >
                    {c.logoURL ? (
                      <img src={c.logoURL} alt={c.name} className="w-10 h-10 rounded-xl mx-auto object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm mx-auto">
                        <Shield size={18} />
                      </div>
                    )}
                    <p className="text-xs font-bold text-gray-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{c.location || 'Bairro'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              COMMUNITY ADS & SPONSORS (Publicidade & Parceiros do Bairro)
              ========================================================================= */}
          <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-sm flex items-center gap-1.5">
                <Megaphone size={16} className="text-emerald-600" />
                {lang === 'pt' ? 'Negócios & Publicidade' : 'Community Sponsors'}
              </h3>
              {onOpenAds && (
                <button
                  onClick={onOpenAds}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  {lang === 'pt' ? 'Ver Todos / Anunciar' : 'View All'}
                </button>
              )}
            </div>

            {communityAds.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-2xl text-center space-y-2">
                <p className="text-xs text-gray-500">
                  {lang === 'pt' ? 'Divulgue a sua oficina, barbearia, restaurante ou loja aqui para todos os jogadores do bairro!' : 'Promote your local business here!'}
                </p>
                {onOpenAds && (
                  <button
                    onClick={onOpenAds}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    {lang === 'pt' ? 'Criar Anúncio' : 'Create Ad'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {communityAds.slice(0, 3).map((ad) => (
                  <div
                    key={ad.id}
                    className="p-3 bg-neutral-900 text-white rounded-2xl border border-neutral-800 space-y-2"
                  >
                    <div className="flex items-start gap-2.5">
                      {ad.imageURL ? (
                        <img 
                          src={ad.imageURL} 
                          alt="" 
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-neutral-700" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-sm">
                          🏪
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {ad.category}
                          </span>
                          {ad.location && (
                            <span className="text-[10px] text-neutral-400 truncate">
                              📍 {ad.location}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white truncate mt-1">
                          {ad.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {ad.businessName}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                      {ad.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
                      {ad.whatsapp && (
                        <a
                          href={`https://wa.me/${ad.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Vi o vosso anúncio "${ad.title}" no Craque do Bairro e gostaria de mais informações.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                        >
                          <MessageCircle size={11} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {ad.phone && (
                        <a
                          href={`tel:${ad.phone}`}
                          className="flex-1 py-1.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                        >
                          <Phone size={11} />
                          <span>Ligar</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simultaneous Live Matches Hub Modal */}
      <LiveMatchesHubModal
        isOpen={showLiveHubModal}
        matches={matches}
        currentUser={user}
        tickets={tickets}
        lang={lang}
        onClose={() => setShowLiveHubModal(false)}
        onSelectLiveMatch={onSelectMatch}
      />
    </div>
  );
}
