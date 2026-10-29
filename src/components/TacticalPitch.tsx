import React, { useState } from 'react';
import { LineupPlayer } from '../types';
import { Language, FORMATION_PRESETS, PLAYER_POSITIONS } from '../constants';
import { Users, Shield, Plus, ArrowRightLeft, Sparkles, CheckCircle, Move, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface TacticalPitchProps {
  team: 'A' | 'B';
  teamName: string;
  formation: string;
  players: LineupPlayer[];
  canManage: boolean;
  lang: Language;
  onPlayerClick: (player: LineupPlayer) => void;
  onChangeFormation: (newFormation: string) => void;
  onToggleStarter: (player: LineupPlayer) => void;
  onSubstitute?: (starter: LineupPlayer, substitute: LineupPlayer) => void;
}

export function TacticalPitch({
  team,
  teamName,
  formation,
  players,
  canManage,
  lang,
  onPlayerClick,
  onChangeFormation,
  onToggleStarter,
  onSubstitute,
}: TacticalPitchProps) {
  const currentPreset = FORMATION_PRESETS.find(p => p.id === formation) || FORMATION_PRESETS[0];

  // Separate starters and bench
  const starters = players.filter(p => p.team === team && p.isStarter);
  const substitutes = players.filter(p => p.team === team && !p.isStarter);

  // Drag and drop states
  const [draggedPlayer, setDraggedPlayer] = useState<LineupPlayer | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const [dragOverBench, setDragOverBench] = useState<boolean>(false);
  const [selectedSubForTapSwap, setSelectedSubForTapSwap] = useState<LineupPlayer | null>(null);
  const [lastSubNotice, setLastSubNotice] = useState<string | null>(null);

  // Map starters to the formation preset slots
  const slotsWithPlayers = currentPreset.slots.map((slot, index) => {
    const assignedPlayer = starters[index] || null;
    return {
      slot,
      index,
      player: assignedPlayer,
    };
  });

  const showSubstitutionFeedback = (outPlayer: LineupPlayer, inPlayer: LineupPlayer) => {
    const notice = lang === 'pt'
      ? `Substituição: Saiu ${outPlayer.playerName} 🔴 ➔ Entrou ${inPlayer.playerName} 🟢`
      : `Subbed: Out ${outPlayer.playerName} 🔴 ➔ In ${inPlayer.playerName} 🟢`;
    setLastSubNotice(notice);
    setTimeout(() => {
      setLastSubNotice(null);
    }, 4000);
  };

  const handlePerformSubstitution = (starter: LineupPlayer, substitute: LineupPlayer) => {
    if (!canManage) return;
    if (starter.id === substitute.id) return;

    if (onSubstitute) {
      onSubstitute(starter, substitute);
    } else {
      onToggleStarter(starter);
      onToggleStarter(substitute);
    }
    showSubstitutionFeedback(starter, substitute);
    setSelectedSubForTapSwap(null);
    setDraggedPlayer(null);
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 border border-black/5 shadow-sm space-y-6">
      {/* Top Bar: Team title, Formation Selector, Starters Count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2.5 h-2.5 rounded-full",
              team === 'A' ? "bg-emerald-600" : "bg-blue-600"
            )} />
            <h3 className="font-extrabold text-gray-900 text-lg">
              {teamName} · {lang === 'pt' ? 'Tática e Onze Inicial' : 'Tactics & Starting XI'}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {lang === 'pt'
              ? `${starters.length} Titulares em campo · ${substitutes.length} Suplentes no banco`
              : `${starters.length} Starters · ${substitutes.length} Substitutes`}
          </p>
        </div>

        {/* Formation dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
            {lang === 'pt' ? 'Esquema:' : 'Formation:'}
          </span>
          <select
            value={formation}
            disabled={!canManage}
            onChange={e => onChangeFormation(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-auto"
          >
            <optgroup label="⚽ Futebol 11 (Campo Oficial)">
              {FORMATION_PRESETS.filter(p => p.category === '11v11').map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="🏟️ Futebol Reduzido (Fut 8 / Fut 7 / Futsal)">
              {FORMATION_PRESETS.filter(p => p.category === 'reduced').map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Drag & Drop Guidance Banner */}
      {canManage && (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <Move className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
            <span>
              {lang === 'pt' 
                ? 'Arraste um suplente para cima de um titular no campo para substituir!' 
                : 'Drag a substitute onto a pitch player to substitute!'}
            </span>
          </div>
          {selectedSubForTapSwap && (
            <button
              onClick={() => setSelectedSubForTapSwap(null)}
              className="px-2 py-0.5 bg-emerald-200 hover:bg-emerald-300 text-emerald-950 font-bold rounded-lg text-[11px]"
            >
              Cancelar troca
            </button>
          )}
        </div>
      )}

      {/* Substitution Live Toast / Banner */}
      {lastSubNotice && (
        <div className="bg-neutral-900 text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between border border-emerald-500/40 animate-bounce">
          <div className="flex items-center gap-2 text-xs font-black">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>{lastSubNotice}</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase font-mono">
            Registado
          </span>
        </div>
      )}

      {/* Visual Soccer Pitch */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[4/4.5] max-w-xl mx-auto rounded-3xl overflow-hidden shadow-inner border-4 border-emerald-900/20 bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-800 select-none">
        {/* Grass pattern stripes */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(0deg,#000_0px,#000_30px,transparent_30px,transparent_60px)] pointer-events-none" />

        {/* White pitch line markings */}
        <div className="absolute inset-4 border-2 border-white/60 rounded-2xl pointer-events-none">
          {/* Halfway line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/60 -translate-y-1/2" />
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
          <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />

          {/* Top Penalty Area (Opponent Box) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border-b-2 border-x-2 border-white/60">
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-10 border-b-2 border-x-2 border-white/60" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/80" />
          </div>

          {/* Bottom Penalty Area (Home Box) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border-t-2 border-x-2 border-white/60">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-10 border-t-2 border-x-2 border-white/60" />
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/80" />
          </div>

          {/* Goals */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-2 bg-white/80 rounded-b-sm" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-2 bg-white/80 rounded-t-sm" />
        </div>

        {/* Players on Pitch */}
        {slotsWithPlayers.map(({ slot, index, player }) => {
          const isExpelled = player && (player.redCards > 0 || player.yellowCards >= 2);
          const pos = player?.position ? PLAYER_POSITIONS[player.position] : null;
          const isDragTarget = dragOverSlotIndex === index;
          const isSelectedForTap = selectedSubForTapSwap && player;

          return (
            <div
              key={`slot_${index}`}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              draggable={canManage && !!player}
              onDragStart={(e) => {
                if (!canManage || !player) return;
                setDraggedPlayer(player);
                e.dataTransfer.setData('text/plain', player.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                if (!canManage || !draggedPlayer) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverSlotIndex(index);
              }}
              onDragLeave={() => {
                if (dragOverSlotIndex === index) {
                  setDragOverSlotIndex(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverSlotIndex(null);
                if (!canManage || !draggedPlayer) return;

                if (draggedPlayer.id === player?.id) return;

                if (!draggedPlayer.isStarter && player) {
                  // Dragged a substitute onto this starter -> substitute!
                  handlePerformSubstitution(player, draggedPlayer);
                } else if (!draggedPlayer.isStarter && !player) {
                  // Dragged substitute onto empty slot -> promote to starter
                  onToggleStarter(draggedPlayer);
                  setDraggedPlayer(null);
                } else if (draggedPlayer.isStarter && player) {
                  // Dragged starter onto starter -> show action or swap
                  onPlayerClick(player);
                }
              }}
              onClick={() => {
                if (selectedSubForTapSwap && player) {
                  // Tap substitution: sub in
                  handlePerformSubstitution(player, selectedSubForTapSwap);
                } else if (player) {
                  onPlayerClick(player);
                } else if (selectedSubForTapSwap && !player) {
                  onToggleStarter(selectedSubForTapSwap);
                  setSelectedSubForTapSwap(null);
                }
              }}
              className={cn(
                "absolute z-10 flex flex-col items-center cursor-pointer group active:scale-90 transition-all rounded-full p-1",
                isDragTarget && "ring-4 ring-amber-400 bg-amber-400/30 scale-110",
                isSelectedForTap && "ring-4 ring-emerald-400 bg-emerald-400/30 animate-pulse scale-105"
              )}
            >
              {player ? (
                <>
                  {/* Player Avatar Pin */}
                  <div className="relative">
                    {player.playerPhoto ? (
                      <img
                        src={player.playerPhoto}
                        alt={player.playerName}
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 shadow-lg transition-all",
                          isExpelled
                            ? "border-red-500 ring-4 ring-red-500/50 opacity-60"
                            : team === 'A'
                            ? "border-emerald-300 ring-2 ring-emerald-500/40"
                            : "border-blue-300 ring-2 ring-blue-500/40"
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shadow-lg text-white border-2 transition-all",
                          isExpelled
                            ? "bg-red-700 border-red-500 ring-4 ring-red-500/50 opacity-60"
                            : team === 'A'
                            ? "bg-emerald-600 border-emerald-300"
                            : "bg-blue-600 border-blue-300"
                        )}
                      >
                        {player.number ? `#${player.number}` : player.playerName.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Disciplinary Cards Overlay Badge */}
                    {player.yellowCards > 0 && player.redCards === 0 && player.yellowCards < 2 && (
                      <div className="absolute -top-1 -right-1 bg-amber-400 text-gray-950 font-black text-[9px] px-1 rounded-sm shadow-sm border border-amber-500">
                        🟨
                      </div>
                    )}

                    {isExpelled && (
                      <div className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] px-1 rounded-sm shadow-sm border border-white animate-pulse">
                        🟥
                      </div>
                    )}

                    {/* Goals badge */}
                    {player.goals > 0 && (
                      <div className="absolute -bottom-1 -left-1 bg-white text-gray-900 font-black text-[9px] px-1 rounded-full shadow-sm border border-gray-300">
                        ⚽{player.goals > 1 ? player.goals : ''}
                      </div>
                    )}

                    {/* Substitution indicator overlay if substitute is dragged over */}
                    {isDragTarget && (
                      <div className="absolute inset-0 bg-amber-500/60 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg animate-pulse">
                        <ArrowRightLeft className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name Label with Position */}
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] sm:text-xs font-bold truncate max-w-[85px] sm:max-w-[100px] text-center shadow-md flex items-center gap-1">
                    <span className="text-[9px] text-emerald-300 font-mono font-black">
                      {pos ? pos.code : slot.label}
                    </span>
                    <span className="truncate">{player.playerName.split(' ')[0]}</span>
                  </div>
                </>
              ) : (
                /* Empty Position Slot */
                <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
                  <div className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-dashed flex items-center justify-center text-white text-[10px] font-black shadow-sm transition-all",
                    isDragTarget ? "border-amber-400 bg-amber-400/40 scale-125" : "border-white/60 bg-white/10"
                  )}>
                    {slot.label}
                  </div>
                  <span className="text-[9px] text-white/80 font-bold mt-0.5 drop-shadow-xs">
                    {slot.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Substitutes / Bench Section */}
      <div 
        onDragOver={(e) => {
          if (!canManage || !draggedPlayer?.isStarter) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverBench(true);
        }}
        onDragLeave={() => setDragOverBench(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverBench(false);
          if (draggedPlayer && draggedPlayer.isStarter) {
            onToggleStarter(draggedPlayer);
            setDraggedPlayer(null);
          }
        }}
        className={cn(
          "space-y-3 pt-2 rounded-2xl p-3 transition-all",
          dragOverBench && "bg-amber-50 border-2 border-dashed border-amber-400"
        )}
      >
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'pt' ? 'Banco de Suplentes / Reservas' : 'Substitutes Bench'}</span>
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {substitutes.length}
            </span>
          </h4>
          <span className="text-[11px] text-gray-400 italic">
            {lang === 'pt' ? 'Arraste para o campo ou clique em "Substituir"' : 'Drag to pitch or click "Sub in"'}
          </span>
        </div>

        {substitutes.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-400 italic border border-gray-100">
            {lang === 'pt'
              ? 'Nenhum suplente no banco. Adiciona mais jogadores inscritos à partida!'
              : 'No substitutes on the bench.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {substitutes.map(sub => {
              const pos = sub.position ? PLAYER_POSITIONS[sub.position] : null;
              const isExpelled = sub.redCards > 0 || sub.yellowCards >= 2;
              const isSelected = selectedSubForTapSwap?.id === sub.id;

              return (
                <div
                  key={sub.id}
                  draggable={canManage}
                  onDragStart={(e) => {
                    if (!canManage) return;
                    setDraggedPlayer(sub);
                    e.dataTransfer.setData('text/plain', sub.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (!canManage || !draggedPlayer?.isStarter) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!canManage || !draggedPlayer?.isStarter) return;
                    // Starter dropped on this substitute -> substitute!
                    handlePerformSubstitution(draggedPlayer, sub);
                  }}
                  onClick={() => onPlayerClick(sub)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 shadow-2xs hover:shadow-xs",
                    isSelected
                      ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/40"
                      : isExpelled
                      ? "bg-red-50/60 border-red-200"
                      : "bg-white border-gray-200 hover:border-emerald-300"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      {sub.playerPhoto ? (
                        <img
                          src={sub.playerPhoto}
                          alt={sub.playerName}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center border border-gray-200">
                          {sub.playerName.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      {sub.yellowCards > 0 && !isExpelled && (
                        <span className="absolute -top-1 -right-1 text-[10px]">🟨</span>
                      )}
                      {isExpelled && (
                        <span className="absolute -top-1 -right-1 text-[10px]">🟥</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {sub.playerName}
                        </span>
                        {sub.number && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            #{sub.number}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {pos ? (
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[9px] font-mono font-black border",
                            pos.badgeBg, pos.badgeText, pos.badgeBorder
                          )}>
                            {pos.code}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-gray-100 text-gray-600">
                            {sub.position || 'JOG'}
                          </span>
                        )}
                        {sub.goals > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600">
                            ⚽ {sub.goals}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (selectedSubForTapSwap?.id === sub.id) {
                            setSelectedSubForTapSwap(null);
                          } else {
                            setSelectedSubForTapSwap(sub);
                          }
                        }}
                        className={cn(
                          "p-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer",
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800"
                        )}
                        title={lang === 'pt' ? 'Selecionar para substituir por um titular' : 'Select for substitution'}
                      >
                        <ArrowRightLeft size={13} />
                        <span className="text-[10px]">{isSelected ? 'A trocar' : 'Trocar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onToggleStarter(sub);
                        }}
                        className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
                        title={lang === 'pt' ? 'Entrar em campo direto' : 'Sub in directly'}
                      >
                        {lang === 'pt' ? 'Entrar' : 'Sub in'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
