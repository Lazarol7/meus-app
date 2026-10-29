import React, { useState, useMemo } from 'react';
import { UserProfile, TechnicalRating } from '../types';
import { LANGUAGES, Language } from '../constants';
import { Shield, Zap, Target, Save, Search, User as UserIcon, X, Filter, Users, Award, Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface PlayerManagerProps {
  players: UserProfile[];
  lang: Language;
  onUpdateRating: (userId: string, ratings: UserProfile['ratings']) => void;
}

export function PlayerManager({ players, lang, onUpdateRating }: PlayerManagerProps) {
  const t = LANGUAGES[lang];
  const [search, setSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [editingPlayer, setEditingPlayer] = useState<UserProfile | null>(null);
  const [tempRatings, setTempRatings] = useState<UserProfile['ratings'] | null>(null);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        p.displayName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.clubName?.toLowerCase().includes(q) ||
        p.position?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedPosition !== 'all') {
        const pos = (p.position || '').toUpperCase();
        if (selectedPosition === 'GK' && pos !== 'GK') return false;
        if (selectedPosition === 'DEF' && !['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(pos)) return false;
        if (selectedPosition === 'MID' && !['CM', 'CDM', 'CAM', 'LM', 'RM', 'MED'].includes(pos)) return false;
        if (selectedPosition === 'ATT' && !['ST', 'CF', 'LW', 'RW', 'AVA'].includes(pos)) return false;
      }

      return true;
    });
  }, [players, search, selectedPosition]);

  const handleEdit = (player: UserProfile) => {
    setEditingPlayer(player);
    setTempRatings(player.ratings);
  };

  const handleSave = () => {
    if (editingPlayer && tempRatings) {
      onUpdateRating(editingPlayer.uid, tempRatings);
      setEditingPlayer(null);
      setTempRatings(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-7 border border-black/5 shadow-sm space-y-6">
      {/* Header with Title and Total Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users size={18} />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {lang === 'pt' ? 'Gestão de Jogadores & Avaliações' : 'Player Manager & Ratings'}
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {lang === 'pt'
              ? 'Pesquise atletas pelo nome, clube ou posição e ajuste os atributos técnicos (OVR).'
              : 'Search players by name, club or position and update technical ratings.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-mono font-bold">
            {filteredPlayers.length} / {players.length} {lang === 'pt' ? 'jogadores' : 'players'}
          </span>
        </div>
      </div>

      {/* Prominent Search Bar & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'pt' ? 'Pesquisar jogador pelo nome, clube ou e-mail...' : 'Search player by name, club or email...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 focus:border-emerald-500 rounded-2xl text-sm font-semibold text-gray-900 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="Limpar pesquisa"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Position Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 mr-1 flex items-center gap-1 shrink-0">
            <Filter size={12} />
            {lang === 'pt' ? 'Posição:' : 'Pos:'}
          </span>
          {[
            { id: 'all', label: lang === 'pt' ? 'Todos' : 'All' },
            { id: 'GK', label: 'Guarda-Redes (GK)' },
            { id: 'DEF', label: 'Defesas (DEF)' },
            { id: 'MID', label: 'Médios (MID)' },
            { id: 'ATT', label: 'Avançados (ATT)' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedPosition(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer",
                selectedPosition === f.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Rating Form */}
      {editingPlayer && tempRatings ? (
        <div className="p-5 bg-emerald-50/80 rounded-3xl border border-emerald-200/80 space-y-5 animate-scale-up shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-emerald-200/50">
            <div className="flex items-center gap-3">
              {editingPlayer.photoURL ? (
                <img src={editingPlayer.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border border-emerald-300 shadow-xs" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 font-black flex items-center justify-center text-sm">
                  {editingPlayer.displayName?.[0] || 'J'}
                </div>
              )}
              <div>
                <h4 className="font-black text-emerald-950 text-base">{editingPlayer.displayName}</h4>
                <p className="text-xs text-emerald-700">
                  {editingPlayer.clubName || (lang === 'pt' ? 'Sem clube definido' : 'Free agent')} · {editingPlayer.position || 'ST'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setEditingPlayer(null)} 
              className="px-3 py-1.5 bg-white/80 hover:bg-white text-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
            >
              {lang === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>

          <div className="space-y-4">
            <RatingSlider
              label={t.defense}
              icon={<Shield className="w-4 h-4 text-blue-500" />}
              value={tempRatings.defense}
              onChange={(v) => setTempRatings({ ...tempRatings, defense: v as TechnicalRating })}
            />
            <RatingSlider
              label={t.passing}
              icon={<Zap className="w-4 h-4 text-yellow-500" />}
              value={tempRatings.passing}
              onChange={(v) => setTempRatings({ ...tempRatings, passing: v as TechnicalRating })}
            />
            <RatingSlider
              label={t.finishing}
              icon={<Target className="w-4 h-4 text-red-500" />}
              value={tempRatings.finishing}
              onChange={(v) => setTempRatings({ ...tempRatings, finishing: v as TechnicalRating })}
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{lang === 'pt' ? 'Guardar Nova Avaliação' : 'Save Rating'}</span>
          </button>
        </div>
      ) : (
        /* Player List */
        <div className="space-y-2">
          {filteredPlayers.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-2xl bg-gray-200/60 text-gray-400 flex items-center justify-center mx-auto">
                <Search size={22} />
              </div>
              <p className="text-sm font-bold text-gray-700">
                {lang === 'pt' ? `Nenhum jogador encontrado com "${search}"` : `No players found matching "${search}"`}
              </p>
              <button
                type="button"
                onClick={() => { setSearch(''); setSelectedPosition('all'); }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {lang === 'pt' ? 'Limpar Filtros e Ver Todos' : 'Clear Filters'}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto pr-1">
              {filteredPlayers.map(p => {
                const ovr = ((p.ratings.defense + p.ratings.passing + p.ratings.finishing) / 3).toFixed(1);
                return (
                  <div key={p.uid} className="py-3 px-2 flex items-center justify-between hover:bg-gray-50/80 rounded-xl transition-colors">
                    <div className="flex items-center min-w-0 pr-2">
                      {p.photoURL ? (
                        <img 
                          src={p.photoURL} 
                          alt="" 
                          className="w-10 h-10 rounded-2xl object-cover mr-3 border border-gray-200 shadow-2xs shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mr-3 shrink-0 font-black text-sm">
                          {p.displayName?.[0] || 'J'}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 truncate">
                            {p.displayName}
                          </span>
                          {p.position && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-[10px]">
                              {p.position}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span className="truncate text-gray-600 font-medium">
                            {p.clubName ? `⚽ ${p.clubName}` : (lang === 'pt' ? 'Sem Clube' : 'Free Agent')}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-emerald-600 font-extrabold flex items-center gap-0.5">
                            <Star size={11} className="fill-emerald-500 text-emerald-500" />
                            OVR {ovr}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEdit(p)}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border border-emerald-200 hover:border-emerald-600 shadow-2xs"
                    >
                      {lang === 'pt' ? 'Avaliar' : 'Rate'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RatingSlider({ label, icon, value, onChange }: { label: string, icon: React.ReactNode, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center text-xs font-bold text-gray-700">
          {icon}
          <span className="ml-2">{label}</span>
        </div>
        <span className="text-xs font-mono font-extrabold text-emerald-600 bg-white px-2 py-0.5 rounded-md border border-gray-200">
          {value} / 5
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
              value === v
                ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-100"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
