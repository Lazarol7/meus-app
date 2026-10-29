import React, { useState } from 'react';
import { Club, UserProfile, ClubPlayer, PlayerPosition } from '../types';
import { Language, PLAYER_POSITIONS } from '../constants';
import { 
  Shield, Plus, Save, X, Users, User, MapPin, Calendar, 
  Trash2, Edit3, Search, Check, AlertCircle, Award, ChevronDown, ChevronUp, UserPlus, Trophy, Filter, Camera
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ImageUploadPicker, DEFAULT_SOCCER_BADGE_PRESETS } from './ImageUploadPicker';

interface ClubManagerProps {
  clubs: Club[];
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  lang: Language;
  onSave: (club: Omit<Club, 'id'>) => Promise<string | undefined> | void;
  onUpdate: (clubId: string, club: Partial<Club>) => Promise<void> | void;
  onDelete?: (clubId: string) => Promise<void> | void;
  onJoin: (club: Club) => Promise<void> | void;
  onLeave?: (club: Club) => Promise<void> | void;
  onCreateMatchWithClub?: (clubId: string) => void;
}

const SVG_BADGE_PRESETS = DEFAULT_SOCCER_BADGE_PRESETS;

export function ClubManager({ 
  clubs, 
  currentUser, 
  allUsers = [], 
  lang, 
  onSave, 
  onUpdate, 
  onDelete, 
  onJoin, 
  onLeave,
  onCreateMatchWithClub 
}: ClubManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'my_club'>('all');
  const [expandedSquadClubId, setExpandedSquadClubId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);
  const [quickSquadInputs, setQuickSquadInputs] = useState<{ [clubId: string]: string }>({});

  // Form states
  const [name, setName] = useState('');
  const [president, setPresident] = useState('');
  const [coach, setCoach] = useState('');
  const [location, setLocation] = useState('');
  const [foundedYear, setFoundedYear] = useState<number>(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [logoURL, setLogoURL] = useState('');
  const [selectedBadgePreset, setSelectedBadgePreset] = useState<number>(0);
  const [league, setLeague] = useState<string>('Liga do Bairro');
  const [customLeague, setCustomLeague] = useState<string>('');
  const [isCustomLeague, setIsCustomLeague] = useState<boolean>(false);
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<string>('all');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  
  // Squad players with positions
  const [squadRoster, setSquadRoster] = useState<ClubPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState<PlayerPosition>('CM');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const resetForm = () => {
    setName('');
    setPresident('');
    setCoach('');
    setLocation('');
    setLeague('Liga do Bairro');
    setCustomLeague('');
    setIsCustomLeague(false);
    setFoundedYear(new Date().getFullYear());
    setDescription('');
    setLogoURL('');
    setSelectedBadgePreset(0);
    setSquadRoster([]);
    setNewPlayerName('');
    setNewPlayerPosition('CM');
    setNewPlayerNumber('');
    setSelectedUserIds([]);
    setEditingClub(null);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
    setPresident(currentUser.displayName || '');
  };

  const handleStartEdit = (club: Club) => {
    setEditingClub(club);
    setIsCreating(false);
    setName(club.name);
    setPresident(club.president || '');
    setCoach(club.coach || '');
    setLocation(club.location || '');
    setLeague(club.league || 'Liga do Bairro');
    setCustomLeague('');
    setIsCustomLeague(false);
    const year = club.foundedAt ? new Date(club.foundedAt).getFullYear() : new Date().getFullYear();
    setFoundedYear(isNaN(year) ? new Date().getFullYear() : year);
    setDescription(club.description || '');
    setLogoURL(club.logoURL || '');
    setSelectedUserIds(club.playerIds || []);

    if (club.playerRoster && club.playerRoster.length > 0) {
      setSquadRoster(club.playerRoster);
    } else if (club.players && club.players.length > 0) {
      // Build roster from legacy string list
      const roster: ClubPlayer[] = club.players.map((p, idx) => ({
        id: `legacy_${idx}_${Date.now()}`,
        name: p,
        position: idx === 0 ? 'GK' : idx < 5 ? 'CB' : idx < 8 ? 'CM' : 'ST',
      }));
      setSquadRoster(roster);
    } else {
      setSquadRoster([]);
    }
  };

  const handleAddPlayerToRoster = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;

    const parsedNum = newPlayerNumber ? parseInt(newPlayerNumber, 10) : undefined;
    const newMember: ClubPlayer = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      position: newPlayerPosition,
      number: !isNaN(parsedNum!) ? parsedNum : undefined,
    };

    setSquadRoster(prev => [...prev, newMember]);
    setNewPlayerName('');
    setNewPlayerNumber('');
  };

  const handleRemoveFromRoster = (idOrName: string) => {
    setSquadRoster(prev => prev.filter(p => p.id !== idOrName && p.name !== idOrName));
  };

  const handleToggleUserSelection = (userToToggle: UserProfile) => {
    const isAlreadyIn = squadRoster.some(p => p.userId === userToToggle.uid);
    if (isAlreadyIn) {
      setSquadRoster(prev => prev.filter(p => p.userId !== userToToggle.uid));
      setSelectedUserIds(prev => prev.filter(id => id !== userToToggle.uid));
    } else {
      const newPlayer: ClubPlayer = {
        id: userToToggle.uid,
        userId: userToToggle.uid,
        name: userToToggle.displayName,
        photoURL: userToToggle.photoURL,
        position: (userToToggle.position as PlayerPosition) || 'CM',
      };
      setSquadRoster(prev => [...prev, newPlayer]);
      setSelectedUserIds(prev => [...prev, userToToggle.uid]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fallbackName = currentUser.displayName
      ? `Clube de ${currentUser.displayName.split(' ')[0]}`
      : (lang === 'pt' ? 'Clube do Bairro' : 'Neighborhood Club');
    const finalName = name.trim() || fallbackName;

    setIsSubmitting(true);
    try {
      const year = foundedYear || new Date().getFullYear();
      const foundedAtTimestamp = new Date(year, 0, 1).getTime();
      
      const cleanRoster = squadRoster.map(p => {
        const item: Record<string, any> = {
          id: p.id,
          name: p.name,
          position: p.position || 'CM',
        };
        if (p.number) item.number = p.number;
        if (p.photoURL) item.photoURL = p.photoURL;
        if (p.userId) item.userId = p.userId;
        return item as ClubPlayer;
      });

      const finalLeague = isCustomLeague ? (customLeague.trim() || 'Liga do Bairro') : (league.trim() || 'Liga do Bairro');

      const clubPayload = {
        name: finalName,
        president: president.trim() || '',
        coach: coach.trim() || '',
        location: location.trim() || '',
        league: finalLeague,
        foundedAt: foundedAtTimestamp,
        description: description.trim() || '',
        logoURL: logoURL.trim() || '',
        players: cleanRoster.map(p => p.name),
        playerRoster: cleanRoster,
        playerIds: cleanRoster.filter(p => p.userId).map(p => p.userId!),
      };

      if (editingClub) {
        await onUpdate(editingClub.id, clubPayload);
        setSaveSuccessMsg(lang === 'pt' ? 'Clube atualizado com sucesso!' : 'Club updated successfully!');
      } else {
        await onSave({
          ...clubPayload,
          createdBy: currentUser.uid,
        });
        setSaveSuccessMsg(lang === 'pt' ? 'Clube guardado com sucesso!' : 'Club saved successfully!');
      }

      resetForm();
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 4000);
    } catch (err) {
      console.error('Error saving club:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!clubToDelete || !onDelete) return;
    try {
      await onDelete(clubToDelete.id);
      setClubToDelete(null);
      setSaveSuccessMsg(lang === 'pt' ? 'Clube eliminado com sucesso.' : 'Club deleted successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error deleting club:', err);
    }
  };

  const handleQuickAddSquadPlayer = async (club: Club) => {
    const rawName = (quickSquadInputs[club.id] || '').trim();
    if (!rawName) return;

    const existingRoster: ClubPlayer[] = club.playerRoster && club.playerRoster.length > 0
      ? [...club.playerRoster]
      : (club.players || []).map((pName, idx) => ({
          id: `p_${idx}_${Date.now()}`,
          name: pName,
          position: (idx === 0 ? 'GK' : idx < 5 ? 'CB' : idx < 8 ? 'CM' : 'ST') as PlayerPosition,
          number: idx + 1,
        }));

    const nextNumber = existingRoster.length + 1;
    const newPlayerItem: ClubPlayer = {
      id: `p_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: rawName,
      position: 'CM',
      number: nextNumber,
    };

    const updatedRoster = [...existingRoster, newPlayerItem];
    const updatedPlayerNames = updatedRoster.map(p => p.name);

    try {
      await onUpdate(club.id, {
        playerRoster: updatedRoster,
        players: updatedPlayerNames,
      });
      setQuickSquadInputs(prev => ({ ...prev, [club.id]: '' }));
    } catch (err) {
      console.error('Failed to quick add squad player:', err);
    }
  };

  const uniqueLeagues = React.useMemo(() => {
    const set = new Set<string>();
    clubs.forEach(c => {
      if (c.league && c.league.trim()) set.add(c.league.trim());
    });
    return Array.from(set);
  }, [clubs]);

  const uniqueLocations = React.useMemo(() => {
    const set = new Set<string>();
    clubs.forEach(c => {
      if (c.location && c.location.trim()) set.add(c.location.trim());
    });
    return Array.from(set);
  }, [clubs]);

  // Filter and search
  const filteredClubs = clubs.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.league && c.league.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.coach && c.coach.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.president && c.president.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.players && c.players.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())));

    if (!matchesSearch) return false;
    if (selectedFilter === 'my_club') {
      if (!(currentUser.clubId === c.id || c.createdBy === currentUser.uid)) return false;
    }
    if (selectedLeagueFilter !== 'all' && (c.league || 'Liga do Bairro') !== selectedLeagueFilter) {
      return false;
    }
    if (selectedLocationFilter !== 'all' && (c.location || '') !== selectedLocationFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="font-bold text-sm">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-white/80 hover:text-white">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-600" />
            {lang === 'pt' ? 'Clubes do Bairro' : lang === 'xangana' ? 'Tiklubi ta Xitandi' : 'Neighborhood Clubs'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {lang === 'pt' 
              ? `${clubs.length} ${clubs.length === 1 ? 'clube registado' : 'clubes registados'}` 
              : `${clubs.length} registered clubs`}
          </p>
        </div>

        {!isCreating && !editingClub && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <Plus size={20} />
            {lang === 'pt' ? 'Adicionar Clube' : 'Add Club'}
          </button>
        )}
      </div>

      {/* Create / Edit Form Modal/Card */}
      {(isCreating || editingClub) && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Shield size={22} />
              </div>
              <div>
                <h3 className="font-black text-lg text-gray-900">
                  {editingClub 
                    ? (lang === 'pt' ? 'Editar Clube' : 'Edit Club') 
                    : (lang === 'pt' ? 'Guardar Novo Clube' : 'Save New Club')}
                </h3>
                <p className="text-xs text-emerald-600 font-semibold">
                  {lang === 'pt' ? '✓ Podes guardar o clube mesmo sem preencher todos os dados e editar depois' : '✓ You can save even with incomplete data and update later'}
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={resetForm} 
              className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Club Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {lang === 'pt' ? 'Nome do Clube' : 'Club Name'}
                </label>
                <span className="text-[11px] text-gray-400">
                  {lang === 'pt' ? '(Opcional)' : '(Optional)'}
                </span>
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                placeholder={lang === 'pt' ? 'Ex: Estrela Vermelha de Maputo' : 'e.g. Red Star FC'}
              />
            </div>

            {/* Location / Bairro / Origem do Clube */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'pt' ? 'Lugar / Bairro do Clube' : 'Neighborhood / Origin'}</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                  placeholder={lang === 'pt' ? 'Ex: Chamanculo, Bairro do Aeroporto, Matola...' : 'e.g. Airport District Field'}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                {lang === 'pt' ? 'Define o local/bairro onde o clube está sedeado' : 'Specifies the club home place'}
              </p>
            </div>

            {/* League / Campeonato em que joga */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>{lang === 'pt' ? 'Campeonato / Liga em que Joga' : 'Championship / League'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomLeague(!isCustomLeague)}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  {isCustomLeague ? (lang === 'pt' ? 'Escolher da lista' : 'Choose from list') : (lang === 'pt' ? '+ Outro campeonato' : '+ Other league')}
                </button>
              </div>

              {isCustomLeague ? (
                <input
                  type="text"
                  value={customLeague}
                  onChange={e => setCustomLeague(e.target.value)}
                  placeholder={lang === 'pt' ? 'Ex: Taça Chamanculo, Superliga 2026...' : 'e.g. Neighborhood Cup'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                />
              ) : (
                <select
                  value={league}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setIsCustomLeague(true);
                    } else {
                      setLeague(e.target.value);
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all cursor-pointer"
                >
                  <option value="Liga do Bairro">Liga do Bairro</option>
                  <option value="Campeonato Comunitário de Maputo">Campeonato Comunitário de Maputo</option>
                  <option value="Taça dos Campeões do Bairro">Taça dos Campeões do Bairro</option>
                  <option value="Liga da Matola">Liga da Matola</option>
                  <option value="Torneio de Fim de Semana">Torneio de Fim de Semana</option>
                  {uniqueLeagues.filter(l => !['Liga do Bairro', 'Campeonato Comunitário de Maputo', 'Taça dos Campeões do Bairro', 'Liga da Matola', 'Torneio de Fim de Semana'].includes(l)).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                  <option value="__custom__">+ Digitar outro campeonato...</option>
                </select>
              )}
              <p className="text-[11px] text-gray-400">
                {lang === 'pt' ? 'Mostra em qual campeonato o clube compete para quem paga a mensalidade' : 'Specifies the tournament where the club participates'}
              </p>
            </div>

            {/* President */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {lang === 'pt' ? 'Presidente' : 'President'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
                <input
                  type="text"
                  value={president}
                  onChange={e => setPresident(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                  placeholder={lang === 'pt' ? 'Nome do Presidente' : 'President Name'}
                />
              </div>
            </div>

            {/* Coach */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {lang === 'pt' ? 'Treinador Principal' : 'Head Coach'}
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
                <input
                  type="text"
                  value={coach}
                  onChange={e => setCoach(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                  placeholder={lang === 'pt' ? 'Nome do Treinador (Mister)' : 'Coach Name'}
                />
              </div>
            </div>

            {/* Founding Year */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {lang === 'pt' ? 'Ano de Fundação' : 'Founded Year'}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
                <input
                  type="number"
                  min="1900"
                  max="2099"
                  value={foundedYear}
                  onChange={e => setFoundedYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                  placeholder="2020"
                />
              </div>
            </div>

          {/* Club Logo / Crest with Gallery Upload */}
          <div className="md:col-span-2">
            <ImageUploadPicker
              label={lang === 'pt' ? 'Logótipo / Emblema do Clube' : 'Club Logo / Crest'}
              value={logoURL}
              onChange={setLogoURL}
              shape="shield"
              placeholderLetter={name || 'C'}
              lang={lang}
              helperText={lang === 'pt' 
                ? 'Escolhe uma imagem da tua galeria (escudo, símbolo da equipa) ou tira uma fotografia com a câmara' 
                : 'Pick an image from your device gallery or take a picture with camera'}
              badgePresets={SVG_BADGE_PRESETS}
            />
          </div>
        </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {lang === 'pt' ? 'História / Descrição do Clube' : 'Club History / Description'}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all h-20 resize-none"
              placeholder={lang === 'pt' ? 'História da equipa, cores principais, lema e títulos do bairro...' : 'Team history, colors, neighborhood titles...'}
            />
          </div>

          {/* SQUAD PLAYERS SECTION */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  {lang === 'pt' ? 'Plantel e Posições dos Jogadores' : 'Squad & Player Positions'}
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    {squadRoster.length}
                  </span>
                </h4>
                <p className="text-xs text-gray-400">
                  {lang === 'pt' 
                    ? 'Define a posição de cada jogador (Guarda-Redes, Defesa, Lateral, Médio, Ponta, Avançado)' 
                    : 'Specify player positions (Goalkeeper, Defense, Fullback, Midfield, Winger, Striker)'}
                </p>
              </div>
            </div>

            {/* Add custom player with position & number */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                {lang === 'pt' ? 'Adicionar Jogador com Posição:' : 'Add Player with Position:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPlayerToRoster();
                    }
                  }}
                  className="sm:col-span-5 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder={lang === 'pt' ? 'Nome do craque (ex: Geny, Mexer, Reinildo)' : 'Player name'}
                />

                <select
                  value={newPlayerPosition}
                  onChange={e => setNewPlayerPosition(e.target.value as PlayerPosition)}
                  className="sm:col-span-4 bg-white border border-gray-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <optgroup label="Baliza / Guarda-Redes">
                    <option value="GK">🧤 {lang === 'pt' ? 'Guarda-Redes (GR / Goleiro)' : 'Goalkeeper (GK)'}</option>
                  </optgroup>
                  <optgroup label="Defesa">
                    <option value="CB">🛡️ {lang === 'pt' ? 'Defesa Central (DC)' : 'Center Back (CB)'}</option>
                    <option value="LB">🏃 {lang === 'pt' ? 'Lateral Esquerdo (LE)' : 'Left Back (LB)'}</option>
                    <option value="RB">🏃 {lang === 'pt' ? 'Lateral Direito (LD)' : 'Right Back (RB)'}</option>
                  </optgroup>
                  <optgroup label="Meio-Campo">
                    <option value="CDM">⚓ {lang === 'pt' ? 'Médio Defensivo / Volante (MDF)' : 'Defensive Mid (CDM)'}</option>
                    <option value="CM">🎯 {lang === 'pt' ? 'Médio Centro (MC)' : 'Central Mid (CM)'}</option>
                    <option value="CAM">🪄 {lang === 'pt' ? 'Médio Ofensivo / Camisa 10 (MO)' : 'Attacking Mid (CAM)'}</option>
                  </optgroup>
                  <optgroup label="Ataque">
                    <option value="LW">⚡ {lang === 'pt' ? 'Extremo / Ponta Esquerda (PE)' : 'Left Winger (LW)'}</option>
                    <option value="RW">⚡ {lang === 'pt' ? 'Extremo / Ponta Direita (PD)' : 'Right Winger (RW)'}</option>
                    <option value="ST">⚽ {lang === 'pt' ? 'Avançado / Centroavante (ATA/PL)' : 'Striker (ST)'}</option>
                  </optgroup>
                </select>

                <input
                  type="number"
                  min="1"
                  max="99"
                  value={newPlayerNumber}
                  onChange={e => setNewPlayerNumber(e.target.value)}
                  className="sm:col-span-1 bg-white border border-gray-200 rounded-xl px-2 py-2.5 text-xs font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Nº"
                />

                <button
                  type="button"
                  onClick={() => handleAddPlayerToRoster()}
                  className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 shadow-xs py-2.5 cursor-pointer"
                >
                  <Plus size={15} />
                  {lang === 'pt' ? 'Adicionar' : 'Add'}
                </button>
              </div>
            </div>

            {/* Registered App Users Selector */}
            {allUsers && allUsers.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {lang === 'pt' ? 'Ou associar jogadores cadastrados na app:' : 'Or link registered app players:'}
                </span>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
                  {allUsers.map(u => {
                    const isSelected = squadRoster.some(p => p.userId === u.uid);
                    return (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => handleToggleUserSelection(u)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                          isSelected
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                        )}
                      >
                        {isSelected ? <Check size={12} /> : <UserPlus size={12} />}
                        <span>{u.displayName}</span>
                        {u.position && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded-md bg-white/30 font-mono">
                            {u.position}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List of squad players tags with positions */}
            {squadRoster.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {lang === 'pt' ? 'Plantel Atual com Posições:' : 'Current Squad with Positions:'}
                </span>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50/80 rounded-2xl border border-gray-100 max-h-56 overflow-y-auto">
                  {squadRoster.map(player => {
                    const posInfo = player.position ? PLAYER_POSITIONS[player.position] : null;
                    return (
                      <div
                        key={player.id}
                        className="bg-white text-gray-800 border border-gray-200 pl-2.5 pr-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
                      >
                        {posInfo ? (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black border",
                            posInfo.badgeBg, posInfo.badgeText, posInfo.badgeBorder
                          )}>
                            {posInfo.code}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            {player.position || 'JOG'}
                          </span>
                        )}

                        {player.number && (
                          <span className="text-gray-400 text-[11px] font-mono">
                            #{player.number}
                          </span>
                        )}

                        <span className="truncate max-w-[140px] text-gray-900">{player.name}</span>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromRoster(player.id)}
                          className="text-gray-400 hover:text-red-600 ml-1 cursor-pointer transition-colors"
                          title={lang === 'pt' ? 'Remover do plantel' : 'Remove'}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <Save size={20} />
              {isSubmitting 
                ? (lang === 'pt' ? 'A guardar clube...' : 'Saving club...') 
                : (lang === 'pt' ? 'Guardar Clube' : 'Save Club')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
            >
              {lang === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={lang === 'pt' ? 'Pesquisar clube, bairro, treinador ou jogador...' : 'Search clubs, fields, coach...'}
            className="w-full bg-white border border-black/5 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Primary Tab Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* League Filter */}
          <div className="relative">
            <select
              value={selectedLeagueFilter}
              onChange={e => setSelectedLeagueFilter(e.target.value)}
              className="bg-white border border-black/10 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              <option value="all">🏆 {lang === 'pt' ? 'Todos os Campeonatos' : 'All Leagues'}</option>
              {uniqueLeagues.map(l => (
                <option key={l} value={l}>🏆 {l}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          {uniqueLocations.length > 0 && (
            <div className="relative">
              <select
                value={selectedLocationFilter}
                onChange={e => setSelectedLocationFilter(e.target.value)}
                className="bg-white border border-black/10 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
              >
                <option value="all">📍 {lang === 'pt' ? 'Todos os Lugares' : 'All Places'}</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>📍 {loc}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setSelectedFilter('all'); setSelectedLeagueFilter('all'); setSelectedLocationFilter('all'); }}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
              selectedFilter === 'all' && selectedLeagueFilter === 'all' && selectedLocationFilter === 'all'
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white text-gray-500 hover:bg-gray-50 border border-black/5"
            )}
          >
            {lang === 'pt' ? 'Todos' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('my_club')}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
              selectedFilter === 'my_club'
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-gray-500 hover:bg-gray-50 border border-black/5"
            )}
          >
            {lang === 'pt' ? 'O Meu Clube' : 'My Club'}
          </button>
        </div>
      </div>

      {/* CLUBS LIST */}
      {filteredClubs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-black/5 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
            <Shield size={36} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {searchTerm 
                ? (lang === 'pt' ? 'Nenhum clube encontrado' : 'No clubs found')
                : (lang === 'pt' ? 'Nenhum clube adicionado ainda' : 'No clubs added yet')}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              {lang === 'pt'
                ? 'Regista a tua equipa do bairro para gerir jogadores, treinador e presidente!'
                : 'Register your neighborhood club to manage players, coach, and squad!'}
            </p>
          </div>
          {!isCreating && (
            <button
              onClick={handleStartCreate}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              {lang === 'pt' ? 'Adicionar Primeiro Clube' : 'Add First Club'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredClubs.map(club => {
            const isUserMember = currentUser.clubId === club.id;
            const isCreator = club.createdBy === currentUser.uid;
            const canManage = isCreator || currentUser.role === 'admin';
            const squadTotal = (club.players?.length || 0) + (club.playerIds?.length || 0);
            const isExpanded = expandedSquadClubId === club.id;

            return (
              <div 
                key={club.id} 
                className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-5 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Bar: Logo, Name, Location, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => canManage && handleStartEdit(club)}
                        className={cn(
                          "relative shrink-0 group",
                          canManage && "cursor-pointer"
                        )}
                        title={canManage ? (lang === 'pt' ? 'Clique para alterar o símbolo do clube' : 'Click to change crest') : undefined}
                      >
                        {club.logoURL ? (
                          <img 
                            src={club.logoURL} 
                            alt={club.name} 
                            className="w-16 h-16 rounded-2xl object-cover border border-emerald-100 shadow-xs group-hover:ring-2 group-hover:ring-emerald-500 transition-all" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-xs group-hover:bg-emerald-700 transition-all">
                            <Shield size={32} />
                          </div>
                        )}
                        {canManage && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white shadow-xs group-hover:scale-110 transition-transform">
                            <Camera size={11} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-black text-gray-900">{club.name}</h3>
                          {isUserMember && (
                            <span className="bg-emerald-500 text-white text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <Check size={10} />
                              {lang === 'pt' ? 'O Teu Clube' : 'Your Club'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 mt-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 font-semibold border border-gray-200/60 shadow-2xs">
                            <MapPin size={12} className="text-emerald-600" />
                            <span>{lang === 'pt' ? 'Lugar:' : 'Place:'} <strong className="text-gray-950 font-bold">{club.location || (lang === 'pt' ? 'Bairro Central' : 'Central')}</strong></span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold shadow-2xs">
                            <Trophy size={12} className="text-amber-600" />
                            <span>{lang === 'pt' ? 'Campeonato:' : 'League:'} <strong className="text-amber-950 font-extrabold">{club.league || (lang === 'pt' ? 'Liga do Bairro' : 'Neighborhood League')}</strong></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Creator / Admin actions */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(club)}
                          className="p-2 text-gray-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer"
                          title={lang === 'pt' ? 'Editar' : 'Edit'}
                        >
                          <Edit3 size={17} />
                        </button>
                        {onDelete && (
                          <button
                            onClick={() => setClubToDelete(club)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                            title={lang === 'pt' ? 'Eliminar' : 'Delete'}
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description if any */}
                  {club.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 italic bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
                      "{club.description}"
                    </p>
                  )}

                  {/* Staff Info: President & Coach */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-100">
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        {lang === 'pt' ? 'Presidente' : 'President'}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 truncate">
                        <User size={13} className="text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{club.president || (lang === 'pt' ? 'Não definido' : 'Not set')}</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        {lang === 'pt' ? 'Treinador' : 'Coach'}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 truncate">
                        <Shield size={13} className="text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{club.coach || (lang === 'pt' ? 'Não definido' : 'Not set')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Squad Preview & Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setExpandedSquadClubId(isExpanded ? null : club.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-600 transition-colors cursor-pointer"
                      >
                        <Users size={14} className="text-emerald-600" />
                        <span>
                          {lang === 'pt' 
                            ? `Plantel (${squadTotal} ${squadTotal === 1 ? 'jogador' : 'jogadores'})` 
                            : `Squad (${squadTotal} players)`}
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {club.foundedAt && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold">
                          <Calendar size={12} />
                          <span>{new Date(club.foundedAt).getFullYear()}</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Squad details */}
                    {isExpanded && (
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 animate-fade-in">
                        {squadTotal === 0 ? (
                          <p className="text-xs text-gray-400 italic">
                            {lang === 'pt' ? 'Nenhum jogador adicionado a este plantel.' : 'No players added to this squad.'}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {/* Roster with positions if available */}
                            {club.playerRoster && club.playerRoster.length > 0 ? (
                              club.playerRoster.map(player => {
                                const pos = player.position ? PLAYER_POSITIONS[player.position] : null;
                                return (
                                  <div
                                    key={player.id}
                                    className="bg-white text-gray-800 border border-gray-200 pl-2 pr-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                                  >
                                    {pos ? (
                                      <span className={cn(
                                        "px-1 py-0.2 rounded text-[9px] font-mono font-black border",
                                        pos.badgeBg, pos.badgeText, pos.badgeBorder
                                      )}>
                                        {pos.code}
                                      </span>
                                    ) : (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-gray-100 text-gray-600">
                                        {player.position || 'JOG'}
                                      </span>
                                    )}
                                    {player.number && (
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        #{player.number}
                                      </span>
                                    )}
                                    <span className="truncate max-w-[120px]">{player.name}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <>
                                {/* Registered app players fallback */}
                                {club.playerIds?.map(uid => {
                                  const p = allUsers.find(u => u.uid === uid);
                                  const pos = p?.position ? PLAYER_POSITIONS[p.position] : null;
                                  return (
                                    <div 
                                      key={uid} 
                                      className="bg-white text-emerald-800 border border-emerald-200 pl-2 pr-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                                    >
                                      {pos ? (
                                        <span className={cn("px-1 py-0.2 rounded text-[9px] font-mono font-black border", pos.badgeBg, pos.badgeText, pos.badgeBorder)}>
                                          {pos.code}
                                        </span>
                                      ) : (
                                        <User size={10} className="text-emerald-600" />
                                      )}
                                      <span>{p?.displayName || 'Jogador'}</span>
                                    </div>
                                  );
                                })}
                                {/* Custom players */}
                                {club.players?.map((pName, idx) => (
                                  <div 
                                    key={`${pName}_${idx}`} 
                                    className="bg-white text-gray-700 border border-gray-200 px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1"
                                  >
                                    <Shield size={10} className="text-gray-400" />
                                    <span>{pName}</span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}

                        {/* Inline Quick Add Squad Player */}
                        {canManage && (
                          <div className="pt-2 border-t border-gray-200/80 flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={lang === 'pt' ? '+ Adicionar jogador ao plantel...' : '+ Add player to squad...'}
                              value={quickSquadInputs[club.id] || ''}
                              onChange={(e) => setQuickSquadInputs(prev => ({ ...prev, [club.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickAddSquadPlayer(club);
                                }
                              }}
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuickAddSquadPlayer(club)}
                              disabled={!(quickSquadInputs[club.id] || '').trim()}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
                            >
                              + {lang === 'pt' ? 'Adicionar' : 'Add'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Join/Leave CTA & Match creation */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {onCreateMatchWithClub && (
                      <button
                        type="button"
                        onClick={() => onCreateMatchWithClub(club.id)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                        title={lang === 'pt' ? 'Criar partida com este clube' : 'Create match with this club'}
                      >
                        <span>⚽</span>
                        <span>{lang === 'pt' ? 'Criar Jogo' : 'Create Match'}</span>
                      </button>
                    )}
                    <span className="text-[11px] text-gray-400 hidden sm:inline">
                      {lang === 'pt' ? 'Equipa Oficial' : 'Official Team'}
                    </span>
                  </div>

                  {isUserMember ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Check size={12} />
                        {lang === 'pt' ? 'Membro Ativo' : 'Active Member'}
                      </span>
                      {onLeave && (
                        <button
                          onClick={() => onLeave(club)}
                          className="text-xs text-gray-400 hover:text-red-600 font-bold px-2 py-1 transition-colors cursor-pointer"
                        >
                          {lang === 'pt' ? 'Sair' : 'Leave'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => onJoin(club)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      {lang === 'pt' ? 'Juntar-se' : 'Join Club'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clubToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-gray-900">
                {lang === 'pt' ? 'Eliminar Clube?' : 'Delete Club?'}
              </h3>
              <p className="text-xs text-gray-500">
                {lang === 'pt' 
                  ? `Tens a certeza que desejas eliminar o clube "${clubToDelete.name}"? Esta ação não pode ser desfeita.` 
                  : `Are you sure you want to delete "${clubToDelete.name}"?`}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setClubToDelete(null)}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                {lang === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-2xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-md shadow-red-600/20 cursor-pointer"
              >
                {lang === 'pt' ? 'Sim, Eliminar' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
