import React, { useState, useEffect } from 'react';
import { Match, Club, LineupPlayer, MatchLineup, UserProfile, PlayerPosition } from '../types';
import { LANGUAGES, Language, FORMATION_PRESETS, PLAYER_POSITIONS } from '../constants';
import { Calendar, MapPin, DollarSign, Users, Save, X, Shield, ArrowLeftRight, AlertCircle, PlusCircle, Trophy, Shirt, Plus } from 'lucide-react';

interface MatchFormProps {
  lang: Language;
  clubs: Club[];
  allUsers?: UserProfile[];
  initialClubId?: string;
  existingLeagues?: string[];
  onSave: (match: Omit<Match, 'id' | 'status' | 'organizerId'>) => void;
  onCancel: () => void;
  onOpenAddClub?: () => void;
}

export function MatchForm({ 
  lang, 
  clubs = [], 
  allUsers = [],
  initialClubId,
  existingLeagues = [], 
  onSave, 
  onCancel, 
  onOpenAddClub 
}: MatchFormProps) {
  const t = LANGUAGES[lang];
  const [league, setLeague] = useState<string>('Liga do Bairro');
  const [customLeague, setCustomLeague] = useState<string>('');
  const [isCustomLeague, setIsCustomLeague] = useState<boolean>(false);

  // Default to today and 16:00 (standard match time)
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>('16:00');
  const [price, setPrice] = useState<number>(0);
  const [maxPlayers, setMaxPlayers] = useState<number>(14);
  const [description, setDescription] = useState<string>('');

  // Tactical Formations
  const [teamAFormation, setTeamAFormation] = useState<string>('4-3-3');
  const [teamBFormation, setTeamBFormation] = useState<string>('4-3-3');

  // Helper to count registered players in a club (from playerRoster, players list, or playerIds)
  const getClubPlayerCount = (c?: Club | null): number => {
    if (!c) return 0;
    if (c.playerRoster && c.playerRoster.length > 0) return c.playerRoster.length;
    if (c.players && c.players.length > 0) return c.players.length;
    if (c.playerIds && c.playerIds.length > 0) return c.playerIds.length;
    return 0;
  };

  // Selected club IDs
  const startingClubA = (initialClubId && clubs.find(c => c.id === initialClubId)) || clubs[0];
  const [teamAClubId, setTeamAClubId] = useState<string>(startingClubA?.id || '');

  // Team B mode: 'club' (outro clube cadastrado) | 'custom' (rival convidado) | 'internal' (jogo interno / titulares vs suplentes)
  const [teamBMode, setTeamBMode] = useState<'club' | 'custom' | 'internal'>(
    clubs.length > 1 ? 'club' : 'custom'
  );

  const startingClubB = clubs.find(c => c.id !== startingClubA?.id) || clubs[1];
  const [teamBClubId, setTeamBClubId] = useState<string>(startingClubB?.id || '');
  const [customTeamBName, setCustomTeamBName] = useState<string>('Estrelas do Bairro');
  const [customTeamBPlayersInput, setCustomTeamBPlayersInput] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Jersey numbers state: { [playerIdOrIndex: string]: number }
  const [teamAJerseys, setTeamAJerseys] = useState<{ [key: string]: number }>({});
  const [teamBJerseys, setTeamBJerseys] = useState<{ [key: string]: number }>({});

  // Extra manual players added directly inside MatchForm
  const [extraTeamAPlayers, setExtraTeamAPlayers] = useState<{ name: string; number: number; position: string }[]>([]);
  const [extraTeamBPlayers, setExtraTeamBPlayers] = useState<{ name: string; number: number; position: string }[]>([]);
  const [quickAddNameA, setQuickAddNameA] = useState<string>('');
  const [quickAddNameB, setQuickAddNameB] = useState<string>('');

  // Selected club objects
  const clubA = clubs.find(c => c.id === teamAClubId) || startingClubA;
  const clubB = clubs.find(c => c.id === teamBClubId);

  // Address defaulted to clubA location or neighborhood pitch
  const [address, setAddress] = useState<string>(clubA?.location || 'Campo do Bairro');

  // Keep club selections valid when clubs array loads or updates
  useEffect(() => {
    if (clubs.length > 0) {
      if (!teamAClubId || !clubs.some(c => c.id === teamAClubId)) {
        const nextA = (initialClubId && clubs.find(c => c.id === initialClubId)) || clubs[0];
        setTeamAClubId(nextA.id);
      }
      if (clubs.length > 1 && (!teamBClubId || teamBClubId === teamAClubId)) {
        const nextB = clubs.find(c => c.id !== (teamAClubId || clubs[0].id));
        if (nextB) setTeamBClubId(nextB.id);
      }
    }
  }, [clubs, initialClubId]);

  // Auto-fill address when Team A changes
  useEffect(() => {
    if (clubA?.location && (!address || address === 'Campo do Bairro' || address.trim() === '')) {
      setAddress(clubA.location);
    }
  }, [clubA?.location]);

  // Handle swapping teams
  const handleSwapTeams = () => {
    if (teamBMode !== 'club') return;
    const prevA = teamAClubId;
    const prevB = teamBClubId;
    setTeamAClubId(prevB);
    setTeamBClubId(prevA);
  };

  const handleQuickAddPlayerA = (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickAddNameA.trim();
    if (!name) return;
    const nextNum = (getClubPlayerCount(clubA) + extraTeamAPlayers.length + 1);
    setExtraTeamAPlayers(prev => [...prev, { name, number: nextNum, position: 'ST' }]);
    setQuickAddNameA('');
  };

  const handleQuickAddPlayerB = (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickAddNameB.trim();
    if (!name) return;
    const nextNum = (getClubPlayerCount(clubB) + extraTeamBPlayers.length + 1);
    setExtraTeamBPlayers(prev => [...prev, { name, number: nextNum, position: 'ST' }]);
    setQuickAddNameB('');
  };

  // Standard positions order for 11 players
  const DEFAULT_POSITIONS: string[] = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];

  // Resolve lineup players for any club cleanly without undefined values
  const resolveClubPlayers = (
    club: Club | null | undefined, 
    teamKey: 'A' | 'B', 
    extraList: { name: string; number: number; position: string }[] = [],
    isInternalSecondSquad: boolean = false
  ): LineupPlayer[] => {
    const jerseyMap = teamKey === 'A' ? teamAJerseys : teamBJerseys;
    let basePlayers: LineupPlayer[] = [];

    if (club) {
      if (club.playerRoster && club.playerRoster.length > 0) {
        // If internal match and club has enough players, split roster
        const sourceRoster = isInternalSecondSquad && club.playerRoster.length >= 14
          ? club.playerRoster.slice(11)
          : club.playerRoster;

        basePlayers = sourceRoster.map((p, idx) => {
          const pKey = p.id || `${teamKey.toLowerCase()}_${idx}`;
          const customNum = jerseyMap[pKey] || jerseyMap[p.name];
          const num = customNum !== undefined ? customNum : (p.number || (idx + 1));
          const lp: LineupPlayer = {
            id: pKey,
            playerId: p.id || pKey,
            playerName: p.name,
            position: p.position || DEFAULT_POSITIONS[idx % DEFAULT_POSITIONS.length],
            number: num,
            isStarter: idx < 11,
            team: teamKey,
            yellowCards: 0,
            redCards: 0,
            goals: 0,
            assists: 0,
          };
          if (p.photoURL) lp.playerPhoto = p.photoURL;
          return lp;
        });
      } else if (club.players && club.players.length > 0) {
        const sourceNames = isInternalSecondSquad && club.players.length >= 14
          ? club.players.slice(11)
          : club.players;

        basePlayers = sourceNames.map((pName, idx) => {
          const pKey = `${teamKey.toLowerCase()}_player_${idx}`;
          const customNum = jerseyMap[pKey] || jerseyMap[pName];
          const num = customNum !== undefined ? customNum : (idx + 1);
          return {
            id: pKey,
            playerId: pKey,
            playerName: pName,
            position: DEFAULT_POSITIONS[idx % DEFAULT_POSITIONS.length],
            number: num,
            isStarter: idx < 11,
            team: teamKey,
            yellowCards: 0,
            redCards: 0,
            goals: 0,
            assists: 0,
          };
        });
      } else if (club.playerIds && club.playerIds.length > 0) {
        basePlayers = club.playerIds.map((uid, idx) => {
          const u = allUsers.find(user => user.uid === uid);
          const name = u?.displayName || `Jogador ${idx + 1}`;
          const pKey = `${teamKey.toLowerCase()}_uid_${uid}`;
          const customNum = jerseyMap[pKey] || jerseyMap[name];
          const num = customNum !== undefined ? customNum : (idx + 1);
          const lp: LineupPlayer = {
            id: pKey,
            playerId: uid,
            playerName: name,
            position: (u?.position as string) || DEFAULT_POSITIONS[idx % DEFAULT_POSITIONS.length],
            number: num,
            isStarter: idx < 11,
            team: teamKey,
            yellowCards: 0,
            redCards: 0,
            goals: 0,
            assists: 0,
          };
          if (u?.photoURL) lp.playerPhoto = u.photoURL;
          return lp;
        });
      }
    }

    // Append extra manual players added in this form
    extraList.forEach((extra, idx) => {
      const pKey = `${teamKey.toLowerCase()}_extra_${idx}`;
      const customNum = jerseyMap[pKey] || jerseyMap[extra.name];
      const num = customNum !== undefined ? customNum : extra.number;
      basePlayers.push({
        id: pKey,
        playerId: pKey,
        playerName: extra.name,
        position: extra.position || 'ST',
        number: num,
        isStarter: (basePlayers.length + idx) < 11,
        team: teamKey,
        yellowCards: 0,
        redCards: 0,
        goals: 0,
        assists: 0,
      });
    });

    // If club has no players at all, generate 11 jersey numbers
    if (basePlayers.length === 0) {
      basePlayers = Array.from({ length: 11 }).map((_, idx) => {
        const pKey = `${teamKey.toLowerCase()}_shirt_${idx + 1}`;
        const num = jerseyMap[pKey] || (idx + 1);
        return {
          id: pKey,
          playerId: pKey,
          playerName: `Camisa #${num}`,
          position: DEFAULT_POSITIONS[idx],
          number: num,
          isStarter: true,
          team: teamKey,
          yellowCards: 0,
          redCards: 0,
          goals: 0,
          assists: 0,
        };
      });
    }

    return basePlayers;
  };

  const handleSave = () => {
    setValidationError(null);

    if (clubs.length === 0) {
      setValidationError(
        lang === 'pt'
          ? 'Nenhum clube registado no app. Adicione primeiro o seu clube com os jogadores.'
          : 'No registered clubs in the app. Please add your club first.'
      );
      return;
    }

    if (!teamAClubId) {
      setValidationError(
        lang === 'pt'
          ? 'Por favor, selecione o clube da casa.'
          : 'Please select the home club.'
      );
      return;
    }

    if (teamBMode === 'club' && !teamBClubId) {
      setValidationError(
        lang === 'pt'
          ? 'Por favor, selecione o clube visitante ou escolha a opção de rival convidado.'
          : 'Please select the away club or toggle guest rival team.'
      );
      return;
    }

    if (teamBMode === 'club' && teamAClubId === teamBClubId) {
      setValidationError(
        lang === 'pt'
          ? 'Para jogar contra o mesmo clube, selecione a opção "Jogo Interno".'
          : 'To play with the same club, select "Internal Match".'
      );
      return;
    }

    const finalAddress = address.trim() || clubA?.location || 'Campo do Bairro';
    const finalDate = date || todayStr;
    const finalTime = time || '16:00';

    const matchDate = new Date(`${finalDate}T${finalTime}`).getTime() || Date.now();
    const finalLeague = isCustomLeague ? (customLeague.trim() || 'Liga do Bairro') : league;

    // Team A Lineup
    const teamAPlayers = resolveClubPlayers(clubA, 'A', extraTeamAPlayers, false);

    // Team B Lineup
    let teamBPlayers: LineupPlayer[] = [];
    let finalTeamBName = 'Equipa Visitante';
    let finalTeamBClubId: string | undefined = undefined;
    let finalTeamBLogoURL = '';

    if (teamBMode === 'club' && clubB) {
      teamBPlayers = resolveClubPlayers(clubB, 'B', extraTeamBPlayers, false);
      finalTeamBName = clubB.name;
      finalTeamBClubId = clubB.id;
      finalTeamBLogoURL = clubB.logoURL || '';
    } else if (teamBMode === 'internal') {
      // Internal match of Club A (e.g. Titulares vs Suplentes)
      teamBPlayers = resolveClubPlayers(clubA, 'B', extraTeamBPlayers, true);
      finalTeamBName = `${clubA?.name || 'Clube'} (Suplentes)`;
      finalTeamBClubId = clubA?.id;
      finalTeamBLogoURL = clubA?.logoURL || '';
    } else {
      // Custom Rival Team squad
      finalTeamBName = customTeamBName.trim() || 'Estrelas do Bairro';
      const customNames = customTeamBPlayersInput
        .split(',')
        .map(n => n.trim())
        .filter(Boolean);

      const baseList = customNames.length > 0
        ? customNames
        : Array.from({ length: 11 }).map((_, idx) => `Camisa #${idx + 1}`);

      teamBPlayers = baseList.map((pName, idx) => {
        const pKey = `b_custom_${idx + 1}`;
        const num = teamBJerseys[pKey] || (idx + 1);
        return {
          id: pKey,
          playerId: pKey,
          playerName: pName.startsWith('Camisa #') ? `Camisa #${num}` : pName,
          position: DEFAULT_POSITIONS[idx % DEFAULT_POSITIONS.length],
          number: num,
          isStarter: idx < 11,
          team: 'B' as const,
          yellowCards: 0,
          redCards: 0,
          goals: 0,
          assists: 0,
        };
      });

      // Add extra manual players for Team B
      extraTeamBPlayers.forEach((extra, idx) => {
        const pKey = `b_extra_${idx}`;
        const num = teamBJerseys[pKey] || extra.number;
        teamBPlayers.push({
          id: pKey,
          playerId: pKey,
          playerName: extra.name,
          position: extra.position || 'ST',
          number: num,
          isStarter: (teamBPlayers.length + idx) < 11,
          team: 'B' as const,
          yellowCards: 0,
          redCards: 0,
          goals: 0,
          assists: 0,
        });
      });
    }

    const teamAPlayerNames = teamAPlayers.map(p => p.playerName);
    const teamBPlayerNames = teamBPlayers.map(p => p.playerName);
    const squadNames = [...teamAPlayerNames, ...teamBPlayerNames];

    const initialLineup: MatchLineup = {
      teamAFormation,
      teamBFormation,
      players: [...teamAPlayers, ...teamBPlayers],
    };

    onSave({
      date: matchDate,
      location: { address: finalAddress, lat: -25.9692, lng: 32.5732 },
      price: Number(price) || 0,
      maxPlayers: Math.max(maxPlayers, teamAPlayers.length + teamBPlayers.length),
      description: description.trim(),
      league: finalLeague,
      teamAName: teamBMode === 'internal' ? `${clubA?.name || 'Clube'} (Titulares)` : (clubA?.name || 'Equipa A'),
      teamBName: finalTeamBName,
      teamAClubId: clubA?.id,
      teamBClubId: finalTeamBClubId,
      teamALogoURL: clubA?.logoURL || '',
      teamBLogoURL: finalTeamBLogoURL,
      lineup: initialLineup,
      playerNames: squadNames,
      squadNames: squadNames,
      teamAPlayerNames,
      teamBPlayerNames,
      timer: {
        status: 'stopped',
        currentMinute: 0,
        stoppageMinutes: 0,
        half: 1,
        elapsedSeconds: 0,
      },
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 border border-black/5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 tracking-wider">
            BeSoccer Match
          </span>
          <h2 className="text-xl font-bold text-gray-900">
            {lang === 'pt' ? 'Criar Nova Partida' : 'Create New Match'}
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* No Clubs Warning */}
      {clubs.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-900">
                {lang === 'pt' ? 'Nenhum clube registado no app' : 'No clubs registered yet'}
              </p>
              <p className="text-amber-700 text-xs mt-1">
                {lang === 'pt'
                  ? 'Crie primeiro um clube com os seus jogadores em "Clubes" para poder organizar partidas.'
                  : 'Please create a club first with your squad in "Clubs" to organize matches.'}
              </p>
            </div>
          </div>
          {onOpenAddClub && (
            <button
              type="button"
              onClick={onOpenAddClub}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              {lang === 'pt' ? 'Ir para Clubes e Adicionar' : 'Go to Clubs & Add'}
            </button>
          )}
        </div>
      )}

      {/* Confrontation Matchup Banner Preview (BeSoccer Style) */}
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="text-center text-[10px] uppercase font-bold text-emerald-400 tracking-widest mb-3">
          {lang === 'pt' ? 'Confronto Oficial' : 'Official Matchup'}
        </div>

        <div className="grid grid-cols-7 items-center gap-2">
          {/* Team A (Home) */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/90 text-white flex items-center justify-center font-black text-xl shadow-md border border-white/20 overflow-hidden mb-1.5">
              {clubA?.logoURL ? (
                <img src={clubA.logoURL} alt={clubA.name} className="w-full h-full object-cover" />
              ) : (
                <Shield className="w-7 h-7 text-white" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase text-emerald-300">
              {lang === 'pt' ? 'Mandante' : 'Home'}
            </span>
            <span className="font-black text-xs md:text-sm truncate max-w-full text-white">
              {clubA?.name || (lang === 'pt' ? 'Escolha Equipa A' : 'Select Team A')}
            </span>
            {clubA && (
              <span className="text-[9px] text-emerald-400 font-mono mt-0.5">
                {(clubA.playerRoster?.length || clubA.players?.length || 0)} jogadores
              </span>
            )}
          </div>

          {/* VS & Swap */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[11px] font-black text-emerald-300">
              VS
            </div>
            {clubs.length >= 2 && teamBMode === 'club' && (
              <button
                type="button"
                onClick={handleSwapTeams}
                title={lang === 'pt' ? 'Trocar Mandante / Visitante' : 'Swap Teams'}
                className="mt-1.5 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Team B (Away) */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/90 text-white flex items-center justify-center font-black text-xl shadow-md border border-white/20 overflow-hidden mb-1.5">
              {teamBMode === 'club' && clubB?.logoURL ? (
                <img src={clubB.logoURL} alt={clubB.name} className="w-full h-full object-cover" />
              ) : teamBMode === 'internal' && clubA?.logoURL ? (
                <img src={clubA.logoURL} alt={clubA.name} className="w-full h-full object-cover" />
              ) : (
                <Shield className="w-7 h-7 text-white" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase text-blue-300">
              {teamBMode === 'internal' ? 'Suplentes' : (lang === 'pt' ? 'Visitante' : 'Away')}
            </span>
            <span className="font-black text-xs md:text-sm truncate max-w-full text-white">
              {teamBMode === 'custom'
                ? (customTeamBName || 'Equipa Visitante')
                : teamBMode === 'internal'
                ? `${clubA?.name || 'Clube'} (Suplentes)`
                : (clubB?.name || (lang === 'pt' ? 'Escolha Equipa B' : 'Select Team B'))}
            </span>
            {teamBMode === 'club' && clubB ? (
              <span className="text-[9px] text-blue-400 font-mono mt-0.5">
                {(clubB.playerRoster?.length || clubB.players?.length || 0)} jogadores
              </span>
            ) : teamBMode === 'internal' && clubA ? (
              <span className="text-[9px] text-emerald-400 font-mono mt-0.5">
                Jogo Interno
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Championship / League Picker */}
      <div className="space-y-2 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            {lang === 'pt' ? 'Liga / Campeonato' : 'League / Championship'}
          </label>
          <button
            type="button"
            onClick={() => setIsCustomLeague(!isCustomLeague)}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
          >
            {isCustomLeague 
              ? (lang === 'pt' ? 'Escolher da lista' : 'Choose from list') 
              : (lang === 'pt' ? '+ Criar nova liga' : '+ Create new league')}
          </button>
        </div>

        {isCustomLeague ? (
          <input
            type="text"
            placeholder={lang === 'pt' ? 'Ex: Taça dos Campeões do Bairro, Superliga 2026' : 'Ex: Neighborhood Champions Cup, Super League 2026'}
            value={customLeague}
            onChange={(e) => setCustomLeague(e.target.value)}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        ) : (
          <select
            value={league}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                setIsCustomLeague(true);
              } else {
                setLeague(e.target.value);
              }
            }}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
          >
            {Array.from(new Set([
              'Liga do Bairro',
              'Campeonato da Comunidade',
              'Taça Amizade',
              'Copa dos Campeões',
              'Torneio de Verão',
              'Amistosos & Peladas',
              ...existingLeagues.filter(Boolean)
            ])).map((lName) => (
              <option key={lName} value={lName}>
                🏆 {lName}
              </option>
            ))}
            <option value="__custom__">
              ✍️ {lang === 'pt' ? '+ Digitar outro campeonato...' : '+ Type other tournament...'}
            </option>
          </select>
        )}
      </div>

      {/* Club Selectors Loaded From App */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team A Selector */}
        <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              {lang === 'pt' ? 'Equipa da Casa (Mandante)' : 'Home Team'}
            </span>
            {clubA && (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded-full">
                ✓ {(clubA.playerRoster?.length || clubA.players?.length || 0)} Jogadores
              </span>
            )}
          </label>
          <select
            value={teamAClubId}
            onChange={(e) => {
              const newId = e.target.value;
              setTeamAClubId(newId);
              if (teamBMode === 'club' && teamBClubId === newId) {
                const alternate = clubs.find(c => c.id !== newId);
                setTeamBClubId(alternate ? alternate.id : '');
              }
            }}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
          >
            <option value="" disabled>
              {lang === 'pt' ? '-- Selecione o Clube --' : '-- Select Club --'}
            </option>
            {clubs.map((c) => {
              const count = getClubPlayerCount(c);
              const hasNoPlayers = count === 0;
              return (
                <option 
                  key={c.id} 
                  value={c.id} 
                  disabled={teamBMode === 'club' && c.id === teamBClubId}
                >
                  ⚽ {c.name} {c.location ? `(${c.location})` : ''} - {hasNoPlayers ? (lang === 'pt' ? 'Numeração por Camisas' : 'Jersey numbers only') : `${count} jogadores`}
                </option>
              );
            })}
          </select>
          {clubA?.location && (
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>{lang === 'pt' ? 'Campo / Sede:' : 'Ground:'} {clubA.location}</span>
            </p>
          )}
        </div>

        {/* Team B Selector (Registered Club OR Custom Rival Team) */}
        <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              {lang === 'pt' ? 'Equipa Visitante / Adversário' : 'Away Team / Rival'}
            </label>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 text-[10px] font-bold">
              {clubs.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setTeamBMode('club')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    teamBMode === 'club' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Clube
                </button>
              )}
              <button
                type="button"
                onClick={() => setTeamBMode('custom')}
                className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  teamBMode === 'custom' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Rival
              </button>
              <button
                type="button"
                onClick={() => setTeamBMode('internal')}
                className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  teamBMode === 'internal' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                title={lang === 'pt' ? 'Jogo-treino entre jogadores do mesmo clube' : 'Internal scrimmage'}
              >
                {lang === 'pt' ? 'Jogo Interno' : 'Internal'}
              </button>
            </div>
          </div>

          {teamBMode === 'club' ? (
            <select
              value={teamBClubId}
              onChange={(e) => setTeamBClubId(e.target.value)}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
            >
              <option value="" disabled>
                {lang === 'pt' ? '-- Selecione o Clube Visitante --' : '-- Select Club --'}
              </option>
              {clubs.map((c) => {
                const count = getClubPlayerCount(c);
                const hasNoPlayers = count === 0;
                return (
                  <option 
                    key={c.id} 
                    value={c.id} 
                    disabled={c.id === teamAClubId}
                  >
                    ⚽ {c.name} {c.location ? `(${c.location})` : ''} - {hasNoPlayers ? (lang === 'pt' ? 'Numeração por Camisas' : 'Jersey numbers only') : `${count} jogadores`}
                  </option>
                );
              })}
            </select>
          ) : teamBMode === 'internal' ? (
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs space-y-1">
              <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span>⚽</span> {lang === 'pt' ? 'Confronto Interno / Jogo-Treino' : 'Internal Club Scrimmage'}
              </p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {lang === 'pt'
                  ? `O jogo será realizado entre os Titulares e Suplentes de "${clubA?.name || 'Clube'}". Não precisa de outro clube para jogar!`
                  : `Match will be played between Starters and Reserves of "${clubA?.name || 'Club'}". No 2nd club needed!`}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="text"
                value={customTeamBName}
                onChange={e => setCustomTeamBName(e.target.value)}
                placeholder={lang === 'pt' ? 'Nome da equipa rival (ex: Estrelas do Bairro)' : 'Rival team name'}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="text"
                value={customTeamBPlayersInput}
                onChange={e => setCustomTeamBPlayersInput(e.target.value)}
                placeholder={lang === 'pt' ? 'Jogadores do rival (opcional, separados por vírgula)' : 'Rival squad player names (optional)'}
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}
          {teamBMode === 'club' && clubB?.coach && (
            <p className="text-[11px] text-gray-500">
              {lang === 'pt' ? 'Treinador:' : 'Coach:'} {clubB.coach}
            </p>
          )}
        </div>
      </div>

      {/* Tactical Formations & Starting XI Setup with Custom Jersey Number Inputs */}
      {(clubA || clubB || teamBMode !== 'club') && (
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <Shirt className="w-5 h-5 text-emerald-600" />
            <div>
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                {lang === 'pt' ? 'Plantel do Clube & Números das Camisas' : 'Club Squad & Jersey Numbers'}
              </h4>
              <p className="text-[11px] text-gray-500">
                {lang === 'pt'
                  ? 'Os jogadores cadastrados já estão associados ao clube. Indique apenas o número da camisa de cada atleta.'
                  : 'Player names are loaded from the club roster. Assign each player their jersey number.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team A Formation & Jersey Numbers */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 truncate">
                  {clubA?.name || 'Equipa A'}
                </span>
                <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">Mandante</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {lang === 'pt' ? 'Esquema Tático:' : 'Formation:'}
                </label>
                <select
                  value={teamAFormation}
                  onChange={e => setTeamAFormation(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {FORMATION_PRESETS.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Club A Player Roster with Jersey Number Input */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {lang === 'pt' ? 'Jogadores & Número da Camisa:' : 'Players & Jersey #:'}
                  </span>
                  {clubA && (
                    <span className="text-[9px] text-emerald-600 font-mono font-bold">
                      {(clubA.playerRoster?.length || clubA.players?.length || 0)} no plantel
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {clubA?.playerRoster && clubA.playerRoster.length > 0 ? (
                    clubA.playerRoster.map((p, idx) => {
                      const pKey = p.id || `a_${idx}`;
                      const currentVal = teamAJerseys[pKey] !== undefined ? teamAJerseys[pKey] : (p.number || idx + 1);
                      return (
                        <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-mono font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                              {p.position || (idx === 0 ? 'GK' : 'JOG')}
                            </span>
                            <span className="font-bold text-gray-800 truncate text-[11px] max-w-[120px]">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={currentVal}
                              onChange={(e) => {
                                const num = parseInt(e.target.value) || 0;
                                setTeamAJerseys(prev => ({ ...prev, [pKey]: num, [p.name]: num }));
                              }}
                              className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : clubA?.players && clubA.players.length > 0 ? (
                    clubA.players.map((pName, idx) => {
                      const pKey = `a_player_${idx}`;
                      const currentVal = teamAJerseys[pKey] !== undefined ? teamAJerseys[pKey] : (idx + 1);
                      return (
                        <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-mono font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                              {idx === 0 ? 'GK' : idx < 5 ? 'DEF' : idx < 8 ? 'MED' : 'AVA'}
                            </span>
                            <span className="font-bold text-gray-800 truncate text-[11px] max-w-[120px]">
                              {pName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={currentVal}
                              onChange={(e) => {
                                const num = parseInt(e.target.value) || 0;
                                setTeamAJerseys(prev => ({ ...prev, [pKey]: num, [pName]: num }));
                              }}
                              className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // CLUB A HAS NO PLAYERS REGISTERED: Render 11 jersey slots with editable numbers
                    <div className="space-y-1.5">
                      <div className="p-2.5 bg-amber-50 text-amber-900 text-xs rounded-xl border border-amber-200/80 flex items-start gap-2">
                        <span className="text-base leading-none">👕</span>
                        <div>
                          <p className="font-bold">
                            {lang === 'pt' ? 'Numeração por Camisas' : 'Jersey Numbers Only'}
                          </p>
                          <p className="text-[11px] text-amber-700">
                            {lang === 'pt'
                              ? 'Este clube ainda não tem nomes registados. A partida será criada com os números das camisas (1 a 11).'
                              : 'No player names registered. Match will be created with jersey numbers (1 to 11).'}
                          </p>
                        </div>
                      </div>
                      {Array.from({ length: 11 }).map((_, idx) => {
                        const pKey = `a_shirt_${idx + 1}`;
                        const currentVal = teamAJerseys[pKey] !== undefined ? teamAJerseys[pKey] : (idx + 1);
                        const posLabel = idx === 0 ? 'GK' : idx < 5 ? 'DEF' : idx < 8 ? 'MED' : 'AVA';
                        return (
                          <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-mono font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                {posLabel}
                              </span>
                              <span className="font-bold text-gray-700 truncate text-[11px]">
                                {lang === 'pt' ? `Camisa #${currentVal}` : `Jersey #${currentVal}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={currentVal}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value) || 0;
                                  setTeamAJerseys(prev => ({ ...prev, [pKey]: num }));
                                }}
                                className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Extra players added for Team A */}
                  {extraTeamAPlayers.map((p, idx) => {
                      const pKey = `a_extra_${idx}`;
                      const currentVal = teamAJerseys[pKey] !== undefined ? teamAJerseys[pKey] : p.number;
                      return (
                        <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-mono font-black bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                              +ADD
                            </span>
                            <span className="font-bold text-gray-800 truncate text-[11px] max-w-[120px]">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={currentVal}
                              onChange={(e) => {
                                const num = parseInt(e.target.value) || 0;
                                setTeamAJerseys(prev => ({ ...prev, [pKey]: num, [p.name]: num }));
                              }}
                              className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setExtraTeamAPlayers(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-0.5"
                              title="Remover"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Inline Quick Add Player for Team A */}
                  <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={quickAddNameA}
                      onChange={(e) => setQuickAddNameA(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddPlayerA(e);
                        }
                      }}
                      placeholder={lang === 'pt' ? '+ Adicionar jogador...' : '+ Add player...'}
                      className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddPlayerA}
                      disabled={!quickAddNameA.trim()}
                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
                    >
                      + {lang === 'pt' ? 'Adicionar' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

            {/* Team B Formation & Jersey Numbers */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 truncate">
                  {teamBMode === 'custom'
                    ? (customTeamBName || 'Equipa Visitante')
                    : teamBMode === 'internal'
                    ? `${clubA?.name || 'Clube'} (Suplentes)`
                    : (clubB?.name || 'Equipa B')}
                </span>
                <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
                  {teamBMode === 'internal' ? 'Suplentes' : 'Visitante'}
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {lang === 'pt' ? 'Esquema Tático:' : 'Formation:'}
                </label>
                <select
                  value={teamBFormation}
                  onChange={e => setTeamBFormation(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {FORMATION_PRESETS.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Club B Player Roster with Jersey Number Input */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {lang === 'pt' ? 'Jogadores & Número da Camisa:' : 'Players & Jersey #:'}
                  </span>
                  {teamBMode === 'club' && clubB && (
                    <span className="text-[9px] text-blue-600 font-mono font-bold">
                      {(clubB.playerRoster?.length || clubB.players?.length || 0)} no plantel
                    </span>
                  )}
                  {teamBMode === 'internal' && clubA && (
                    <span className="text-[9px] text-emerald-600 font-mono font-bold">
                      Jogo Interno
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {teamBMode === 'club' && clubB?.playerRoster && clubB.playerRoster.length > 0 ? (
                    clubB.playerRoster.map((p, idx) => {
                      const pKey = p.id || `b_${idx}`;
                      const currentVal = teamBJerseys[pKey] !== undefined ? teamBJerseys[pKey] : (p.number || idx + 1);
                      return (
                        <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-mono font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                              {p.position || (idx === 0 ? 'GK' : 'JOG')}
                            </span>
                            <span className="font-bold text-gray-800 truncate text-[11px] max-w-[120px]">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={currentVal}
                              onChange={(e) => {
                                const num = parseInt(e.target.value) || 0;
                                setTeamBJerseys(prev => ({ ...prev, [pKey]: num, [p.name]: num }));
                              }}
                              className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : teamBMode === 'club' && clubB?.players && clubB.players.length > 0 ? (
                    clubB.players.map((pName, idx) => {
                      const pKey = `b_player_${idx}`;
                      const currentVal = teamBJerseys[pKey] !== undefined ? teamBJerseys[pKey] : (idx + 1);
                      return (
                        <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-mono font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                              {idx === 0 ? 'GK' : idx < 5 ? 'DEF' : idx < 8 ? 'MED' : 'AVA'}
                            </span>
                            <span className="font-bold text-gray-800 truncate text-[11px] max-w-[120px]">
                              {pName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={currentVal}
                              onChange={(e) => {
                                const num = parseInt(e.target.value) || 0;
                                setTeamBJerseys(prev => ({ ...prev, [pKey]: num, [pName]: num }));
                              }}
                              className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : teamBMode === 'internal' ? (
                    <div className="space-y-1.5">
                      {clubA?.playerRoster && clubA.playerRoster.length >= 12 ? (
                        clubA.playerRoster.slice(11).map((p, idx) => {
                          const pKey = `b_internal_${p.id || idx}`;
                          const currentVal = teamBJerseys[pKey] !== undefined ? teamBJerseys[pKey] : (p.number || idx + 12);
                          return (
                            <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[9px] font-mono font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  SUP
                                </span>
                                <span className="font-bold text-gray-800 truncate text-[11px] max-w-[120px]">
                                  {p.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const num = parseInt(e.target.value) || 0;
                                    setTeamBJerseys(prev => ({ ...prev, [pKey]: num, [p.name]: num }));
                                  }}
                                  className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        Array.from({ length: 11 }).map((_, idx) => {
                          const pKey = `b_shirt_${idx + 1}`;
                          const currentVal = teamBJerseys[pKey] !== undefined ? teamBJerseys[pKey] : (idx + 1);
                          return (
                            <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[9px] font-mono font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  SUP
                                </span>
                                <span className="font-bold text-gray-700 truncate text-[11px]">
                                  Suplente #{currentVal}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const num = parseInt(e.target.value) || 0;
                                    setTeamBJerseys(prev => ({ ...prev, [pKey]: num }));
                                  }}
                                  className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : teamBMode === 'custom' ? (
                    <div className="space-y-1.5">
                      <div className="p-2 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200">
                        ℹ️ {lang === 'pt' ? 'Equipa convidada rival terá camisas numeradas automaticamente.' : 'Rival squad will be numbered automatically.'}
                      </div>
                      {Array.from({ length: 11 }).map((_, idx) => {
                        const pKey = `b_custom_${idx + 1}`;
                        const currentVal = teamBJerseys[pKey] !== undefined ? teamBJerseys[pKey] : (idx + 1);
                        return (
                          <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-mono font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                JOG
                              </span>
                              <span className="font-bold text-gray-700 truncate text-[11px]">
                                {lang === 'pt' ? `Camisa #${currentVal}` : `Jersey #${currentVal}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={currentVal}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value) || 0;
                                  setTeamBJerseys(prev => ({ ...prev, [pKey]: num }));
                                }}
                                className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Default fallback: 11 jersey numbers
                    <div className="space-y-1.5">
                      {Array.from({ length: 11 }).map((_, idx) => {
                        const pKey = `b_shirt_${idx + 1}`;
                        const currentVal = teamBJerseys[pKey] !== undefined ? teamBJerseys[pKey] : (idx + 1);
                        return (
                          <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-mono font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                JOG
                              </span>
                              <span className="font-bold text-gray-700 truncate text-[11px]">
                                {lang === 'pt' ? `Camisa #${currentVal}` : `Jersey #${currentVal}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={currentVal}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value) || 0;
                                  setTeamBJerseys(prev => ({ ...prev, [pKey]: num }));
                                }}
                                className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Extra players added for Team B */}
                  {extraTeamBPlayers.map((p, idx) => {
                    const pKey = `b_extra_${idx}`;
                    const currentVal = teamBJerseys[pKey] !== undefined ? teamBJerseys[pKey] : p.number;
                    return (
                      <div key={pKey} className="flex items-center justify-between gap-2 p-1.5 bg-blue-50/60 rounded-lg border border-blue-200 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[9px] font-mono font-black bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">
                            +ADD
                          </span>
                          <span className="font-bold text-gray-800 truncate text-[11px] max-w-[120px]">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-gray-400 font-mono font-bold">Camisa #</span>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={currentVal}
                            onChange={(e) => {
                              const num = parseInt(e.target.value) || 0;
                              setTeamBJerseys(prev => ({ ...prev, [pKey]: num, [p.name]: num }));
                            }}
                            className="w-12 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setExtraTeamBPlayers(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 p-0.5"
                            title="Remover"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Inline Quick Add Player for Team B */}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={quickAddNameB}
                    onChange={(e) => setQuickAddNameB(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddPlayerB(e);
                      }
                    }}
                    placeholder={lang === 'pt' ? '+ Adicionar jogador...' : '+ Add player...'}
                    className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddPlayerB}
                    disabled={!quickAddNameB.trim()}
                    className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
                  >
                    + {lang === 'pt' ? 'Adicionar' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
            {lang === 'pt' ? 'Data da Partida' : 'Date'}
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
            {lang === 'pt' ? 'Hora' : 'Time'}
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Location / Pitch Address */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
            {lang === 'pt' ? 'Campo / Localização' : 'Pitch / Location'}
          </label>
          {clubA?.location && address !== clubA.location && (
            <button
              type="button"
              onClick={() => setAddress(clubA.location!)}
              className="text-[10px] text-emerald-600 font-bold hover:underline"
            >
              {lang === 'pt' ? `Usar campo do ${clubA.name}` : `Use ${clubA.name}'s ground`}
            </button>
          )}
        </div>
        <div className="relative">
          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'pt' ? 'Ex: Campo do Costa do Sol, Maputo' : 'Ex: Central Pitch, Maputo'}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Price & Max Players */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
            {lang === 'pt' ? 'Preço p/ Jogador (MZN)' : 'Price per Player (MZN)'}
          </label>
          <div className="relative">
            <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
            {lang === 'pt' ? 'Limite de Jogadores' : 'Max Players'}
          </label>
          <div className="relative">
            <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              min="2"
              max="50"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 14)}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
          {t.description}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={lang === 'pt' ? 'Notas, regras ou observações do clássico...' : 'Match notes or rules...'}
          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px] resize-none"
        />
      </div>

      {/* Validation error display */}
      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Submit Button */}
      {clubs.length === 0 ? (
        <button
          type="button"
          onClick={onOpenAddClub}
          className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center shadow-lg shadow-amber-600/20 active:scale-[0.99] cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          {lang === 'pt' ? 'Adicionar Clube com Jogadores Primeiro' : 'Add Club with Players First'}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center shadow-lg shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
        >
          <Save className="w-5 h-5 mr-2" />
          {lang === 'pt' ? 'Criar Partida Oficial' : 'Create Match'}
        </button>
      )}
    </div>
  );
}
