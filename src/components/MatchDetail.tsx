import React, { useState, useMemo } from 'react';
import { Match, Registration, UserProfile, MatchStats, MatchPhoto, MatchTimer, LineupPlayer, MatchLineup, LiveTicket, CommunityAd, MatchLiveEvent, CommunityLeague, SetPieceType } from '../types';
import { LANGUAGES, Language, PLAYER_POSITIONS } from '../constants';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { 
  MapPin, Calendar, Users, DollarSign, ArrowLeft, CheckCircle2, 
  Clock, Trophy, Target, Zap, Shield, Trash2, AlertTriangle, 
  Play, Flag, Eye, Shirt, Sparkles, Video, Radio, Award, AlertCircle, RefreshCw
} from 'lucide-react';
import { MapDisplay } from './MapDisplay';
import { TeamDivider } from './TeamDivider';
import { PaymentStatus } from './PaymentStatus';
import { StatsForm } from './StatsForm';
import { MatchPhotoGallery } from './MatchPhotoGallery';
import { MatchLiveTimer } from './MatchLiveTimer';
import { TacticalPitch } from './TacticalPitch';
import { PlayerCardActionModal } from './PlayerCardActionModal';
import { MatchLiveStreamModal } from './MatchLiveStreamModal';
import { SetPieceDecisionModal } from './SetPieceDecisionModal';
import { cn } from '../lib/utils';

interface MatchDetailProps {
  match: Match;
  registrations: (Registration & { user?: UserProfile })[];
  stats: MatchStats[];
  photos?: MatchPhoto[];
  currentUser: UserProfile;
  lang: Language;
  communityAds?: CommunityAd[];
  liveTickets?: LiveTicket[];
  communityLeagues?: CommunityLeague[];
  allMatches?: Match[];
  onSelectMatch?: (matchId: string) => void;
  onBack: () => void;
  onRegister: () => void;
  onCancelRegistration: (regId: string) => void;
  onTogglePaid: (regId: string, currentStatus: boolean) => void;
  onFinishMatch: (stats: Omit<MatchStats, 'id'>[], scoreA: number, scoreB: number) => void;
  onCancelMatch: () => void;
  onDeleteMatch?: (matchId: string) => Promise<void> | void;
  onUpdateMatch?: (matchId: string, updates: Partial<Match>) => Promise<void> | void;
  onPlayerClick: (player: UserProfile) => void;
  onAddPhoto?: (photo: Omit<MatchPhoto, 'id' | 'createdAt'>) => Promise<void> | void;
  onDeletePhoto?: (photoId: string) => Promise<void> | void;
  onStartLiveStream?: (price: number) => Promise<void> | void;
  onStopLiveStream?: () => Promise<void> | void;
  onBuyLiveTicket?: (amount: number, method: 'mpesa' | 'emola' | 'card') => Promise<void> | void;
  onSaveLiveEvent?: (event: Omit<MatchLiveEvent, 'id' | 'createdAt'>) => Promise<void> | void;
  onOpenLicenseRenewal?: () => void;
}

export function MatchDetail({ 
  match, 
  registrations, 
  stats, 
  photos = [], 
  currentUser, 
  lang, 
  communityAds = [],
  liveTickets = [],
  communityLeagues = [],
  allMatches = [],
  onSelectMatch,
  onBack, 
  onRegister, 
  onCancelRegistration, 
  onTogglePaid, 
  onFinishMatch, 
  onCancelMatch, 
  onDeleteMatch,
  onUpdateMatch,
  onPlayerClick,
  onAddPhoto,
  onDeletePhoto,
  onStartLiveStream,
  onStopLiveStream,
  onBuyLiveTicket,
  onSaveLiveEvent,
  onOpenLicenseRenewal,
}: MatchDetailProps) {
  const t = LANGUAGES[lang];
  const dateLocale = lang === 'pt' ? ptBR : enUS;
  const confirmedRegs = registrations.filter(r => r.status === 'confirmed');
  const confirmedCount = confirmedRegs.length;
  const isFull = confirmedCount >= match.maxPlayers;
  const userRegistration = registrations.find(r => r.userId === currentUser.uid);
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'lazaroatalia80@gmail.com';
  const isOrganizer = match.organizerId === currentUser.uid || isAdmin;
  const isBroadcaster = match.liveStream?.broadcasterId === currentUser.uid;
  const isMatchAdmin = isAdmin || isOrganizer || isBroadcaster;

  // Live Ticket verification for current user & match
  const hasPaidTicket = liveTickets.some(t => 
    t.matchId === match.id && 
    t.userId === currentUser.uid && 
    (t.status === 'completed' || !t.status)
  ) || (currentUser.purchasedLiveMatchIds?.includes(match.id)) || (currentUser.accountStatus === 'paid' && currentUser.hasLiveAccess);
  const isFreeStream = (match.liveStream?.price === 0);
  const isVideoFeedAuthorized = isMatchAdmin || hasPaidTicket || isFreeStream;

  // View state: 'overview' | 'pitch' | 'teams' | 'stats'
  const [activeTab, setActiveTab] = useState<'pitch' | 'overview' | 'teams'>('pitch');
  const [selectedTacticalTeam, setSelectedTacticalTeam] = useState<'A' | 'B'>('A');

  // Modal states
  const [isFinishing, setIsFinishing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showSetPieceModal, setShowSetPieceModal] = useState(false);
  const [setPieceType, setSetPieceType] = useState<SetPieceType | 'goal' | 'yellow_card' | 'red_card'>('goal');

  // Community League License Check
  const matchedLeague = communityLeagues.find(l => 
    (match.league && l.name.toLowerCase() === match.league.toLowerCase()) ||
    l.id === (match as any).communityLeagueId
  );
  const isLeagueExpired = matchedLeague && (matchedLeague.status === 'expired' || Date.now() > matchedLeague.expiresAt);

  // Player action modal state (for cards & match events)
  const [cardModalPlayer, setCardModalPlayer] = useState<LineupPlayer | null>(null);

  // Initial Lineup derivation from registrations & match
  const lineup: MatchLineup = useMemo(() => {
    if (match.lineup && match.lineup.players && match.lineup.players.length > 0) {
      return match.lineup;
    }

    // Auto-generate lineup if not yet explicitly saved
    const halfLen = Math.ceil(confirmedRegs.length / 2);
    const teamARegs = confirmedRegs.slice(0, halfLen);
    const teamBRegs = confirmedRegs.slice(halfLen);

    const generatedPlayers: LineupPlayer[] = [
      ...teamARegs.map((reg, idx) => ({
        id: reg.id,
        playerId: reg.userId,
        playerName: reg.user?.displayName || `Jogador A${idx + 1}`,
        playerPhoto: reg.user?.photoURL,
        position: reg.user?.position || (idx === 0 ? 'GK' : idx < 5 ? 'CB' : idx < 8 ? 'CM' : 'ST'),
        number: idx + 1,
        isStarter: idx < 11,
        team: 'A' as const,
        yellowCards: 0,
        redCards: 0,
        goals: 0,
        assists: 0,
      })),
      ...teamBRegs.map((reg, idx) => ({
        id: reg.id,
        playerId: reg.userId,
        playerName: reg.user?.displayName || `Jogador B${idx + 1}`,
        playerPhoto: reg.user?.photoURL,
        position: reg.user?.position || (idx === 0 ? 'GK' : idx < 5 ? 'CB' : idx < 8 ? 'CM' : 'ST'),
        number: idx + 1,
        isStarter: idx < 11,
        team: 'B' as const,
        yellowCards: 0,
        redCards: 0,
        goals: 0,
        assists: 0,
      })),
    ];

    return {
      teamAFormation: match.lineup?.teamAFormation || '4-3-3',
      teamBFormation: match.lineup?.teamBFormation || '4-3-3',
      players: generatedPlayers,
    };
  }, [match.lineup, confirmedRegs]);

  // Handle Match Timer Updates
  const handleUpdateTimer = (newTimer: MatchTimer, newStatus?: Match['status']) => {
    if (!onUpdateMatch) return;
    const updates: Partial<Match> = {
      timer: newTimer,
    };
    if (newStatus) {
      updates.status = newStatus;
    }
    onUpdateMatch(match.id, updates);
  };

  // Handle Formation Change
  const handleChangeFormation = (newFormation: string) => {
    if (!onUpdateMatch) return;
    const updatedLineup: MatchLineup = {
      ...lineup,
      teamAFormation: selectedTacticalTeam === 'A' ? newFormation : lineup.teamAFormation,
      teamBFormation: selectedTacticalTeam === 'B' ? newFormation : lineup.teamBFormation,
    };
    onUpdateMatch(match.id, { lineup: updatedLineup });
  };

  // Handle Toggle Starter (promote/demote between 11 inicial and banco)
  const handleToggleStarter = (player: LineupPlayer) => {
    if (!onUpdateMatch) return;
    const updatedPlayers = lineup.players.map(p => {
      if (p.id === player.id || p.playerId === player.playerId) {
        return { ...p, isStarter: !p.isStarter };
      }
      return p;
    });

    const updatedLineup: MatchLineup = {
      ...lineup,
      players: updatedPlayers,
    };

    onUpdateMatch(match.id, { lineup: updatedLineup });
    if (cardModalPlayer && cardModalPlayer.id === player.id) {
      setCardModalPlayer(prev => prev ? { ...prev, isStarter: !prev.isStarter } : null);
    }
  };

  // Direct substitution: Starter goes to bench, substitute enters pitch
  const handleSubstitutePlayers = (starter: LineupPlayer, substitute: LineupPlayer) => {
    if (!onUpdateMatch) return;
    const updatedPlayers = lineup.players.map(p => {
      if (p.id === starter.id || p.playerId === starter.playerId) {
        return { ...p, isStarter: false };
      }
      if (p.id === substitute.id || p.playerId === substitute.playerId) {
        return { ...p, isStarter: true };
      }
      return p;
    });

    onUpdateMatch(match.id, {
      lineup: {
        ...lineup,
        players: updatedPlayers,
      }
    });

    // Also register a live event for the substitution if during live match
    if (onSaveLiveEvent) {
      onSaveLiveEvent({
        matchId: match.id,
        minute: Math.min(90, Math.max(1, Math.floor((Date.now() - (match.date || Date.now())) / 60000))),
        type: 'substitution',
        team: starter.team,
        teamName: starter.team === 'A' ? (match.teamAName || 'Equipa A') : (match.teamBName || 'Equipa B'),
        playerName: substitute.playerName,
        substitutedPlayerName: starter.playerName,
        description: `Substituição: Saiu ${starter.playerName} 🔴, Entrou ${substitute.playerName} 🟢`,
      });
    }
  };

  // Disciplinary Cards Handlers
  const handleAddYellowCard = (player: LineupPlayer) => {
    if (!onUpdateMatch) return;
    const currentYellows = player.yellowCards || 0;
    const newYellows = currentYellows + 1;
    // 2nd Yellow Card triggers expulsion!
    const newReds = newYellows >= 2 ? Math.max(player.redCards, 1) : player.redCards;

    const updatedPlayers = lineup.players.map(p => {
      if (p.id === player.id || p.playerId === player.playerId) {
        return {
          ...p,
          yellowCards: newYellows,
          redCards: newReds,
        };
      }
      return p;
    });

    const updatedLineup: MatchLineup = {
      ...lineup,
      players: updatedPlayers,
    };

    onUpdateMatch(match.id, { lineup: updatedLineup });
    setCardModalPlayer(prev => prev ? { ...prev, yellowCards: newYellows, redCards: newReds } : null);
  };

  const handleAddRedCard = (player: LineupPlayer) => {
    if (!onUpdateMatch) return;
    const updatedPlayers = lineup.players.map(p => {
      if (p.id === player.id || p.playerId === player.playerId) {
        return {
          ...p,
          redCards: 1,
        };
      }
      return p;
    });

    const updatedLineup: MatchLineup = {
      ...lineup,
      players: updatedPlayers,
    };

    onUpdateMatch(match.id, { lineup: updatedLineup });
    setCardModalPlayer(prev => prev ? { ...prev, redCards: 1 } : null);
  };

  const handleRemoveCards = (player: LineupPlayer) => {
    if (!onUpdateMatch) return;
    const updatedPlayers = lineup.players.map(p => {
      if (p.id === player.id || p.playerId === player.playerId) {
        return {
          ...p,
          yellowCards: 0,
          redCards: 0,
        };
      }
      return p;
    });

    const updatedLineup: MatchLineup = {
      ...lineup,
      players: updatedPlayers,
    };

    onUpdateMatch(match.id, { lineup: updatedLineup });
    setCardModalPlayer(prev => prev ? { ...prev, yellowCards: 0, redCards: 0 } : null);
  };

  const handleAddGoal = (player: LineupPlayer) => {
    if (!onUpdateMatch) return;
    const newGoals = (player.goals || 0) + 1;
    const updatedPlayers = lineup.players.map(p => {
      if (p.id === player.id || p.playerId === player.playerId) {
        return { ...p, goals: newGoals };
      }
      return p;
    });

    // Update scoreboard automatically
    const teamScoreKey = player.team === 'A' ? 'scoreA' : 'scoreB';
    const currentScore = (player.team === 'A' ? match.scoreA : match.scoreB) || 0;

    onUpdateMatch(match.id, {
      lineup: { ...lineup, players: updatedPlayers },
      [teamScoreKey]: currentScore + 1,
    });

    setCardModalPlayer(prev => prev ? { ...prev, goals: newGoals } : null);
  };

  const handleRemoveGoal = (player: LineupPlayer) => {
    if (!onUpdateMatch) return;
    const newGoals = Math.max(0, (player.goals || 0) - 1);
    const updatedPlayers = lineup.players.map(p => {
      if (p.id === player.id || p.playerId === player.playerId) {
        return { ...p, goals: newGoals };
      }
      return p;
    });

    const teamScoreKey = player.team === 'A' ? 'scoreA' : 'scoreB';
    const currentScore = (player.team === 'A' ? match.scoreA : match.scoreB) || 0;

    onUpdateMatch(match.id, {
      lineup: { ...lineup, players: updatedPlayers },
      [teamScoreKey]: Math.max(0, currentScore - 1),
    });

    setCardModalPlayer(prev => prev ? { ...prev, goals: newGoals } : null);
  };

  const handleAddAssist = (player: LineupPlayer) => {
    if (!onUpdateMatch) return;
    const newAssists = (player.assists || 0) + 1;
    const updatedPlayers = lineup.players.map(p => {
      if (p.id === player.id || p.playerId === player.playerId) {
        return { ...p, assists: newAssists };
      }
      return p;
    });

    onUpdateMatch(match.id, {
      lineup: { ...lineup, players: updatedPlayers },
    });

    setCardModalPlayer(prev => prev ? { ...prev, assists: newAssists } : null);
  };

  // Delete Match handler
  const handleDeleteMatchExecute = async () => {
    if (!onDeleteMatch) return;
    setIsDeleting(true);
    try {
      await onDeleteMatch(match.id);
      onBack();
    } catch (err) {
      console.error('Error deleting match:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isFinishing) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-6 py-4 flex items-center">
          <button onClick={() => setIsFinishing(false)} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="ml-4 text-lg font-bold text-gray-900 truncate">Finalizar Partida</h2>
        </div>
        <div className="max-w-md mx-auto w-full p-6">
          <StatsForm
            matchId={match.id}
            players={registrations.filter(r => r.status === 'confirmed' && r.user).map(r => r.user!)}
            lang={lang}
            onSave={(statsToSave, sA, sB) => {
              onFinishMatch(statsToSave, sA, sB);
              setIsFinishing(false);
            }}
            onCancel={() => setIsFinishing(false)}
          />
        </div>
      </div>
    );
  }

  const handleSaveSetPieceEvent = async (event: Omit<MatchLiveEvent, 'id' | 'createdAt'>) => {
    if (onSaveLiveEvent) {
      await onSaveLiveEvent(event);
    }
    // If it was a goal, automatically update score and player stats (scorer + assistant)
    if (event.outcome === 'goal' || event.type === 'goal') {
      const isTeamA = event.team === 'A';
      const key = isTeamA ? 'scoreA' : 'scoreB';
      const currentScore = (isTeamA ? match.scoreA : match.scoreB) || 0;
      
      const updatedPlayers = lineup.players.map(p => {
        const isTaker = (event.takerId && (p.playerId === event.takerId || p.id === event.takerId)) || (p.playerName === event.takerName);
        const isAssistant = event.assistantId && ((p.playerId === event.assistantId || p.id === event.assistantId) || (p.playerName === event.assistantName));
        
        let newG = p.goals || 0;
        let newA = p.assists || 0;
        if (isTaker) newG += 1;
        if (isAssistant) newA += 1;

        if (isTaker || isAssistant) {
          return { ...p, goals: newG, assists: newA };
        }
        return p;
      });

      if (onUpdateMatch) {
        onUpdateMatch(match.id, { 
          [key]: currentScore + 1,
          lineup: { ...lineup, players: updatedPlayers },
        });
      }
    } else if (event.type === 'yellow_card') {
      const updatedPlayers = lineup.players.map(p => {
        const isTarget = (event.takerId && (p.playerId === event.takerId || p.id === event.takerId)) || (p.playerName === event.takerName);
        if (isTarget) {
          const newY = (p.yellowCards || 0) + 1;
          const newR = newY >= 2 ? Math.max(p.redCards || 0, 1) : (p.redCards || 0);
          return { ...p, yellowCards: newY, redCards: newR };
        }
        return p;
      });
      if (onUpdateMatch) {
        onUpdateMatch(match.id, { lineup: { ...lineup, players: updatedPlayers } });
      }
    } else if (event.type === 'red_card') {
      const updatedPlayers = lineup.players.map(p => {
        const isTarget = (event.takerId && (p.playerId === event.takerId || p.id === event.takerId)) || (p.playerName === event.takerName);
        if (isTarget) {
          return { ...p, redCards: Math.max(p.redCards || 0, 1) };
        }
        return p;
      });
      if (onUpdateMatch) {
        onUpdateMatch(match.id, { lineup: { ...lineup, players: updatedPlayers } });
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="ml-3 min-w-0">
            <h2 className="text-base md:text-lg font-bold text-gray-900 truncate">
              {format(match.date, "EEEE, d 'de' MMMM", { locale: dateLocale })}
            </h2>
            {match.league && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                🏆 {match.league}
              </span>
            )}
          </div>
        </div>

        {/* Live and Delete Header Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Live Stream Button in Header */}
          <button
            type="button"
            onClick={() => setShowLiveModal(true)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              match.liveStream?.isLive
                ? isVideoFeedAuthorized
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-rose-800 hover:bg-rose-900 text-white border border-rose-400/40'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Video size={14} />
            <span>
              {match.liveStream?.isLive 
                ? isVideoFeedAuthorized 
                  ? '🔴 Live' 
                  : `🔒 Live (${match.liveStream.price || 50} MT)` 
                : 'Live'}
            </span>
            {match.liveStream?.isLive && (
              <span className="bg-black/30 text-[10px] px-1 rounded-md font-mono">
                {match.liveStream.viewerCount || 0}
              </span>
            )}
          </button>

          {/* Delete Match Button (Organizer or Admin) */}
          {isOrganizer && onDeleteMatch && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title={lang === 'pt' ? 'Excluir esta partida' : 'Delete match'}
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">{lang === 'pt' ? 'Excluir' : 'Delete'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Expired Community League Warning */}
        {isLeagueExpired && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase text-rose-700">Licença da Comunidade Expirada</p>
                <p className="text-xs text-rose-600 mt-0.5">
                  A mensalidade da liga {matchedLeague?.name} está vencida. Estatísticas e funcionalidades completas pausadas até à regularização.
                </p>
              </div>
            </div>
            {onOpenLicenseRenewal && (
              <button
                type="button"
                onClick={onOpenLicenseRenewal}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw size={13} />
                <span>Renovar via M-Pesa</span>
              </button>
            )}
          </div>
        )}

        {/* LIVE 90-MINUTE MATCH CLOCK & STOPPAGE (ACRÉSCIMOS) */}
        <MatchLiveTimer
          timer={match.timer}
          matchStatus={match.status}
          scoreA={match.scoreA ?? 0}
          scoreB={match.scoreB ?? 0}
          teamAName={match.teamAName || 'Equipa A'}
          teamBName={match.teamBName || 'Equipa B'}
          teamALogoURL={match.teamALogoURL}
          teamBLogoURL={match.teamBLogoURL}
          canManage={isOrganizer}
          lang={lang}
          onUpdateTimer={handleUpdateTimer}
          onOpenFinishModal={() => setIsFinishing(true)}
        />

        {/* Live Stream & Set-Piece Decisions Bar */}
        <div className="bg-white rounded-2xl p-3.5 border border-black/5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowLiveModal(true)}
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                match.liveStream?.isLive
                  ? isVideoFeedAuthorized
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-rose-300 border border-rose-500/50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Video size={16} />
              {match.liveStream?.isLive ? (
                <>
                  <span>{isVideoFeedAuthorized ? '🔴 Assistir em Direto' : '🔒 Desbloquear Feed da Live'}</span>
                  <span className="bg-black/30 px-2 py-0.5 rounded-full text-[10px]">
                    👥 {match.liveStream.viewerCount || 0} a assistir
                  </span>
                </>
              ) : (
                <span>{isOrganizer ? 'Iniciar Live do Jogo' : 'Sala da Live Stream'}</span>
              )}
            </button>

            {/* Live Feed Authorization Status Badge */}
            {match.liveStream?.isLive && (
              <>
                {isMatchAdmin ? (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/15 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                    <Shield size={13} className="text-amber-600" />
                    <span>Administrador (Acesso Livre)</span>
                  </span>
                ) : hasPaidTicket ? (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Bilhete Pago & Acesso Liberado</span>
                  </span>
                ) : isFreeStream ? (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300 flex items-center gap-1.5 shadow-2xs">
                    <span>Transmissão Aberta Gratuita</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
                    <AlertTriangle size={13} className="text-rose-600" />
                    <span>Feed Bloqueado · Bilhete: {(match.liveStream.price || 50).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                  </span>
                )}
              </>
            )}
          </div>

          {/* Match Events: Golo & Assistência, Pênalti, Livre, Cartões */}
          {isOrganizer && (
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSetPieceType('goal');
                  setShowSetPieceModal(true);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Registar Golo e Assistência da partida"
              >
                <span>⚽ Registar Golo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSetPieceType('penalty');
                  setShowSetPieceModal(true);
                }}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Decidir quem vai bater o pênalti e desfecho"
              >
                <AlertTriangle size={14} />
                <span>⚠️ Pênalti</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSetPieceType('free_kick');
                  setShowSetPieceModal(true);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Decidir quem bate o livre direto"
              >
                <Flag size={14} />
                <span>🎯 Livre</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSetPieceType('yellow_card');
                  setShowSetPieceModal(true);
                }}
                className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Registar Cartão Amarelo ou Vermelho"
              >
                <span>🟨 Cartão</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Events / Set-Piece & Goal Narration Ticker */}
        {match.liveEvents && match.liveEvents.length > 0 && (
          <div className="bg-neutral-900 rounded-2xl p-3 border border-neutral-800 text-white space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[10px] tracking-wider">
                <Radio size={12} className="text-emerald-400 animate-pulse" />
                Lances Decisivos & Eventos da Partida
              </span>
              <span>{match.liveEvents.length} lances</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {[...match.liveEvents].reverse().slice(0, 8).map((ev) => (
                <div 
                  key={ev.id} 
                  className="bg-neutral-950/80 p-2 rounded-xl border border-neutral-800 text-xs flex items-start gap-2"
                >
                  <span className="font-mono text-emerald-400 font-bold shrink-0">{ev.minute}'</span>
                  <span className="font-bold shrink-0">
                    {ev.type === 'goal' && <span className="text-emerald-400">⚽ GOLO:</span>}
                    {ev.type === 'penalty' && <span className="text-amber-400">⚠️ PÊNALTI:</span>}
                    {ev.type === 'free_kick' && <span className="text-blue-400">🎯 LIVRE:</span>}
                    {ev.type === 'yellow_card' && <span className="text-yellow-400">🟨 CARTÃO:</span>}
                    {ev.type === 'red_card' && <span className="text-rose-400">🟥 VERMELHO:</span>}
                  </span>
                  <div className="flex-1">
                    <span className="text-neutral-200">{ev.description}</span>
                    <span className="text-neutral-500 text-[10px] ml-1">({ev.teamName})</span>
                    {ev.assistantName && (
                      <span className="inline-flex items-center ml-1.5 px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded text-[10px] font-semibold">
                        👟 Assistência: {ev.assistantName}
                      </span>
                    )}
                  </div>
                  {(ev.outcome === 'goal' || ev.type === 'goal') && (
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase">
                      ⚽ Golo
                    </span>
                  )}
                  {ev.outcome === 'saved' && (
                    <span className="text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase">
                      🧤 Defesa
                    </span>
                  )}
                  {ev.outcome === 'post' && (
                    <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase">
                      🥅 Trave
                    </span>
                  )}
                  {ev.type === 'yellow_card' && (
                    <span className="text-[10px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.5 rounded uppercase">
                      🟨 Amarelo
                    </span>
                  )}
                  {ev.type === 'red_card' && (
                    <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase">
                      🟥 Vermelho
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nav Tabs: Campo Tático, Informações, Divisão de Times */}
        <div className="flex bg-gray-200/70 p-1 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('pitch')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              activeTab === 'pitch'
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Shirt size={14} className="text-emerald-600" />
            <span>{lang === 'pt' ? 'Onze Inicial & Campo' : 'Pitch & Starting XI'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              activeTab === 'overview'
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Eye size={14} className="text-blue-600" />
            <span>{lang === 'pt' ? 'Detalhes & Campo' : 'Details'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              activeTab === 'teams'
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Users size={14} className="text-purple-600" />
            <span>{lang === 'pt' ? 'Divisão & Pagamentos' : 'Teams & Finance'}</span>
          </button>
        </div>

        {/* TAB 1: TACTICAL PITCH & STARTING XI */}
        {activeTab === 'pitch' && (
          <div className="space-y-4">
            {/* Team Toggle (Mandante vs Visitante) */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedTacticalTeam('A')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold transition-all border flex items-center justify-center gap-2 cursor-pointer",
                  selectedTacticalTeam === 'A'
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                  {match.teamALogoURL ? (
                    <img src={match.teamALogoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>A</span>
                  )}
                </div>
                <span className="truncate">{match.teamAName || t.teamA}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-black/15">
                  {lineup.teamAFormation}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTacticalTeam('B')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold transition-all border flex items-center justify-center gap-2 cursor-pointer",
                  selectedTacticalTeam === 'B'
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                  {match.teamBLogoURL ? (
                    <img src={match.teamBLogoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>B</span>
                  )}
                </div>
                <span className="truncate">{match.teamBName || t.teamB}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-black/15">
                  {lineup.teamBFormation}
                </span>
              </button>
            </div>

            {/* Tactical Pitch Component */}
            <TacticalPitch
              team={selectedTacticalTeam}
              teamName={selectedTacticalTeam === 'A' ? (match.teamAName || 'Equipa A') : (match.teamBName || 'Equipa B')}
              formation={selectedTacticalTeam === 'A' ? lineup.teamAFormation : lineup.teamBFormation}
              players={lineup.players}
              canManage={isOrganizer}
              lang={lang}
              onPlayerClick={player => setCardModalPlayer(player)}
              onChangeFormation={handleChangeFormation}
              onToggleStarter={handleToggleStarter}
              onSubstitute={handleSubstitutePlayers}
            />
          </div>
        )}

        {/* TAB 2: OVERVIEW & LOCATION */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-emerald-600 uppercase tracking-wider">
                      {match.status === 'open' ? t.automaticCall : 
                       match.status === 'in_progress' ? 'Em Andamento' :
                       match.status === 'finished' ? 'Finalizada' : 
                       match.status === 'cancelled' ? t.matchCancelled : t.matchFull}
                    </span>
                    {match.league && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        🏆 {match.league}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                    {format(match.date, "EEEE, d 'de' MMMM · HH:mm", { locale: dateLocale })}
                  </h1>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  match.status === 'open' ? "bg-emerald-100 text-emerald-700" : 
                  match.status === 'in_progress' ? "bg-amber-100 text-amber-800 animate-pulse" :
                  match.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                )}>
                  {match.status === 'open' ? t.confirm : 
                   match.status === 'in_progress' ? 'Ao Vivo' :
                   match.status === 'finished' ? 'Fim' : 
                   match.status === 'cancelled' ? t.cancel : t.matchFull}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600 text-sm">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mr-3">
                    <Users className="w-4 h-4 opacity-50" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t.matches}</span>
                    <span className="font-bold text-gray-900">{confirmedCount} / {match.maxPlayers}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mr-3">
                    <DollarSign className="w-4 h-4 opacity-50" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t.finance}</span>
                    <span className="font-bold text-gray-900">{match.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-gray-600 text-sm">
                  <MapPin className="w-4 h-4 mr-2 opacity-50" />
                  <span className="font-medium">{match.location.address}</span>
                </div>
                <MapDisplay center={match.location} address={match.location.address} />
              </div>

              {match.description && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block mb-2">{t.description}</span>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{match.description}</p>
                </div>
              )}

              {/* Registration CTAs */}
              {!userRegistration && match.status === 'open' && (
                <button
                  onClick={onRegister}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {t.register}
                </button>
              )}

              {userRegistration && match.status !== 'finished' && (
                <div className="space-y-3">
                  <div className={cn(
                    "w-full py-4 rounded-2xl font-bold flex items-center justify-center",
                    userRegistration.status === 'confirmed' ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"
                  )}>
                    {userRegistration.status === 'confirmed' ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        {t.confirm}
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 mr-2" />
                        {t.waitingList}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => onCancelRegistration(userRegistration.id)}
                    className="w-full py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                </div>
              )}

              {/* Organizer Cancel & Finish buttons */}
              {isOrganizer && match.status !== 'finished' && match.status !== 'cancelled' && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setIsFinishing(true)}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg cursor-pointer"
                  >
                    {t.stats} - Finalizar Partida
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t.matchCancelledMsg)) {
                        onCancelMatch();
                      }
                    }}
                    className="w-full py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  >
                    {t.cancel} - Cancelar Partida
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TEAM DIVISION & FINANCE */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            {confirmedCount >= 4 && (
              <TeamDivider
                players={registrations.filter(r => r.status === 'confirmed' && r.user).map(r => r.user!)}
                registrations={registrations}
                language={lang as any}
                onPlayerClick={onPlayerClick}
              />
            )}

            <PaymentStatus
              registrations={registrations}
              lang={lang}
              isOrganizer={isOrganizer}
              onTogglePaid={onTogglePaid}
              onPlayerClick={onPlayerClick}
            />
          </div>
        )}

        {/* Photo Gallery */}
        {onAddPhoto && (
          <MatchPhotoGallery
            matchId={match.id}
            photos={photos}
            currentUser={currentUser}
            isOrganizer={isOrganizer}
            lang={lang}
            onAddPhoto={onAddPhoto}
            onDeletePhoto={onDeletePhoto}
          />
        )}

        {/* Finished Match Stats */}
        {match.status === 'finished' && stats.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{t.stats}</h3>
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {stats.map(s => {
                  const player = registrations.find(r => r.userId === s.playerId)?.user;
                  return (
                    <div key={s.id} className="p-4 flex items-center justify-between">
                      <div 
                        className="flex items-center cursor-pointer flex-1"
                        onClick={() => player && onPlayerClick(player)}
                      >
                        {player?.photoURL ? (
                          <img 
                            src={player.photoURL} 
                            alt={player.displayName} 
                            className="w-8 h-8 rounded-full object-cover mr-3 border border-emerald-100"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs mr-3">
                            {player?.displayName?.[0] || '?'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{player?.displayName || 'Jogador'}</span>
                          {s.isMOTM && (
                            <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-widest flex items-center">
                              <Trophy className="w-3 h-3 mr-1" />
                              {t.motm}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center text-gray-600">
                          <Target className="w-4 h-4 mr-1 text-emerald-500" />
                          <span className="text-sm font-bold">{s.goals}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Zap className="w-4 h-4 mr-1 text-blue-500" />
                          <span className="text-sm font-bold">{s.assists}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Delete Match Bottom Area */}
        {isOrganizer && onDeleteMatch && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-red-900">
                {lang === 'pt' ? 'Zona de Perigo da Partida' : 'Match Danger Zone'}
              </h4>
              <p className="text-xs text-red-700">
                {lang === 'pt'
                  ? 'Permite excluir esta partida (finalizada ou não) e todos os registos associados.'
                  : 'Delete this match (whether finished or not) and all associated records.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Trash2 size={14} />
              <span>{lang === 'pt' ? 'Excluir Partida' : 'Delete'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Disciplinary Cards & Player Action Modal */}
      <PlayerCardActionModal
        player={cardModalPlayer}
        isOpen={!!cardModalPlayer}
        canManage={isOrganizer}
        lang={lang}
        onClose={() => setCardModalPlayer(null)}
        onAddYellow={handleAddYellowCard}
        onAddRed={handleAddRedCard}
        onRemoveCards={handleRemoveCards}
        onAddGoal={handleAddGoal}
        onRemoveGoal={handleRemoveGoal}
        onAddAssist={handleAddAssist}
        onToggleStarter={handleToggleStarter}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-center animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">
                {lang === 'pt' ? 'Excluir esta partida?' : 'Delete this match?'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {lang === 'pt'
                  ? 'Tem certeza de que deseja excluir permanentemente esta partida? Todos os jogadores, escalações, fotos e estatísticas serão removidos. Esta ação não pode ser desfeita.'
                  : 'Are you sure you want to permanently delete this match? All players, lineups, and stats will be removed.'}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteMatchExecute}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isDeleting 
                  ? (lang === 'pt' ? 'Excluindo...' : 'Deleting...') 
                  : (lang === 'pt' ? 'Sim, Excluir' : 'Yes, Delete')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Live Video Streaming Modal */}
      <MatchLiveStreamModal
        isOpen={showLiveModal}
        match={match}
        currentUser={currentUser}
        tickets={liveTickets}
        ads={communityAds}
        lang={lang}
        allMatches={allMatches}
        onSwitchLiveMatch={(matchId) => {
          if (onSelectMatch) {
            setShowLiveModal(false);
            onSelectMatch(matchId);
          }
        }}
        onClose={() => setShowLiveModal(false)}
        onStartLive={async (price) => {
          if (onStartLiveStream) await onStartLiveStream(price);
        }}
        onStopLive={async () => {
          if (onStopLiveStream) await onStopLiveStream();
        }}
        onBuyTicket={async (amount, method) => {
          if (onBuyLiveTicket) await onBuyLiveTicket(amount, method);
        }}
        onJoinViewer={() => {
          if (onUpdateMatch) {
            const currentViewers = match.liveStream?.viewerCount || 0;
            const viewersList = match.liveStream?.viewers || [];
            if (!viewersList.includes(currentUser.uid)) {
              onUpdateMatch(match.id, {
                liveStream: {
                  ...match.liveStream!,
                  viewerCount: currentViewers + 1,
                  viewers: [...viewersList, currentUser.uid],
                }
              });
            }
          }
        }}
        onLeaveViewer={() => {
          if (onUpdateMatch && match.liveStream?.viewers?.includes(currentUser.uid)) {
            const viewersList = (match.liveStream.viewers || []).filter(id => id !== currentUser.uid);
            onUpdateMatch(match.id, {
              liveStream: {
                ...match.liveStream,
                viewerCount: Math.max(0, (match.liveStream.viewerCount || 1) - 1),
                viewers: viewersList,
              }
            });
          }
        }}
        onSaveLiveEvent={handleSaveSetPieceEvent}
      />

      {/* Set-Piece Decision Modal (Penalty & Free Kicks) */}
      <SetPieceDecisionModal
        isOpen={showSetPieceModal}
        match={match}
        type={setPieceType}
        players={lineup.players}
        currentMinute={match.timer?.currentMinute || 0}
        lang={lang}
        onClose={() => setShowSetPieceModal(false)}
        onSaveEvent={handleSaveSetPieceEvent}
      />
    </div>
  );
}
