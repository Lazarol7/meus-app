import React, { useState, useEffect } from 'react';
import { Match, LineupPlayer, SetPieceType, SetPieceOutcome, MatchLiveEvent } from '../types';
import { Language } from '../constants';
import { X, Award, Shield, AlertTriangle, CheckCircle2, Crosshair, Flag, Sparkles, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type LiveModalEventType = SetPieceType | 'goal' | 'yellow_card' | 'red_card';

interface SetPieceDecisionModalProps {
  isOpen: boolean;
  match: Match;
  type: LiveModalEventType;
  players: LineupPlayer[];
  currentMinute: number;
  lang: Language;
  onClose: () => void;
  onSaveEvent: (event: Omit<MatchLiveEvent, 'id' | 'createdAt'>) => void;
}

export function SetPieceDecisionModal({
  isOpen,
  match,
  type: initialType,
  players,
  currentMinute,
  lang,
  onClose,
  onSaveEvent,
}: SetPieceDecisionModalProps) {
  const [activeType, setActiveType] = useState<LiveModalEventType>(initialType);
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');
  const [minute, setMinute] = useState<number>(currentMinute || 1);
  const [selectedTakerId, setSelectedTakerId] = useState<string>('');
  const [selectedAssistId, setSelectedAssistId] = useState<string>('none');
  const [goalType, setGoalType] = useState<'open_play' | 'header' | 'penalty' | 'free_kick' | 'long_range'>('open_play');
  const [outcome, setOutcome] = useState<SetPieceOutcome>('goal');
  const [customComment, setCustomComment] = useState('');

  useEffect(() => {
    setActiveType(initialType);
    setMinute(currentMinute || 1);
  }, [initialType, currentMinute, isOpen]);

  if (!isOpen) return null;

  const teamName = selectedTeam === 'A' ? (match.teamAName || 'Equipa A') : (match.teamBName || 'Equipa B');
  const opposingTeam = selectedTeam === 'A' ? 'B' : 'A';
  const opposingTeamName = selectedTeam === 'A' ? (match.teamBName || 'Equipa B') : (match.teamAName || 'Equipa A');

  // Players from selected team
  const teamPlayers = players.filter(p => p.team === selectedTeam);
  // Opposing goalkeeper
  const opposingGoalkeeper = players.find(p => p.team === opposingTeam && (p.position === 'GK' || p.isStarter)) || null;

  // Selected taker / scorer / carded player
  const selectedTaker = teamPlayers.find(p => p.playerId === selectedTakerId || p.id === selectedTakerId) || teamPlayers[0];
  // Selected assistant (cannot be the scorer)
  const assistCandidates = teamPlayers.filter(p => (p.playerId || p.id) !== (selectedTaker?.playerId || selectedTaker?.id));
  const selectedAssistant = selectedAssistId !== 'none'
    ? assistCandidates.find(p => p.playerId === selectedAssistId || p.id === selectedAssistId)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const takerName = selectedTaker?.playerName || (lang === 'pt' ? 'Jogador' : 'Player');
    const gkName = opposingGoalkeeper?.playerName || (lang === 'pt' ? 'Guarda-Redes' : 'Goalkeeper');
    const assistName = selectedAssistant?.playerName;

    let eventOutcome: SetPieceOutcome | undefined = outcome;
    let outcomeDesc = '';

    if (activeType === 'goal') {
      eventOutcome = 'goal';
      const goalTypeLabel = goalType === 'header' 
        ? (lang === 'pt' ? 'de cabeça' : 'header')
        : goalType === 'penalty'
        ? (lang === 'pt' ? 'de grande penalidade' : 'penalty')
        : goalType === 'free_kick'
        ? (lang === 'pt' ? 'de livre direto' : 'free kick')
        : goalType === 'long_range'
        ? (lang === 'pt' ? 'de fora da área' : 'long range')
        : (lang === 'pt' ? 'em jogada de ataque' : 'open play');

      if (assistName) {
        outcomeDesc = `⚽ GOLO do ${teamName}! ${takerName} marcou ${goalTypeLabel}, após excelente assistência de ${assistName}!`;
      } else {
        outcomeDesc = `⚽ GOLO do ${teamName}! ${takerName} marcou ${goalTypeLabel} em jogada individual!`;
      }
    } else if (activeType === 'penalty') {
      if (outcome === 'goal') {
        outcomeDesc = `⚽ GOLO DE PÊNALTI! ${takerName} converteu com frieza para o ${teamName}!`;
      } else if (outcome === 'saved') {
        outcomeDesc = `🧤 DEFENDEU O GUARDA-REDES! ${gkName} defendeu com categoria a cobrança de pênalti de ${takerName}!`;
      } else if (outcome === 'post') {
        outcomeDesc = `🥅 NA TRAVE! O pênalti de ${takerName} explodiu no poste!`;
      } else {
        outcomeDesc = `❌ FALHOU O PÊNALTI! ${takerName} chutou para fora!`;
      }
    } else if (activeType === 'free_kick') {
      if (outcome === 'goal') {
        outcomeDesc = `⚽ GOLAÇO DE LIVRE! ${takerName} bateu com precisão milimétrica para o fundo das redes!`;
      } else if (outcome === 'saved') {
        outcomeDesc = `🧤 DEFESAÇA! ${gkName} voou para espalmar o livre direto perigoso de ${takerName}!`;
      } else if (outcome === 'post') {
        outcomeDesc = `🥅 NO POSTE! O livre direto de ${takerName} carimbou a trave!`;
      } else if (outcome === 'wall') {
        outcomeDesc = `🧱 BATEU NA BARREIRA! A barreira do ${opposingTeamName} bloqueou a cobrança!`;
      } else {
        outcomeDesc = `❌ PARA FORA! O livre direto de ${takerName} saiu ao lado da baliza!`;
      }
    } else if (activeType === 'yellow_card') {
      outcomeDesc = `🟨 CARTÃO AMARELO para ${takerName} (${teamName}) aos ${minute}'!`;
    } else if (activeType === 'red_card') {
      outcomeDesc = `🟥 CARTÃO VERMELHO! ${takerName} (${teamName}) foi expulso da partida aos ${minute}'!`;
    }

    if (customComment.trim()) {
      outcomeDesc += ` (${customComment.trim()})`;
    }

    onSaveEvent({
      matchId: match.id,
      minute,
      type: activeType,
      team: selectedTeam,
      teamName,
      takerId: selectedTaker?.playerId || selectedTaker?.id || 'taker',
      takerName,
      assistantId: selectedAssistant?.playerId || selectedAssistant?.id,
      assistantName: assistName,
      goalkeeperId: opposingGoalkeeper?.playerId,
      goalkeeperName: gkName,
      outcome: eventOutcome,
      description: outcomeDesc,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md bg-emerald-500 text-white font-black">
                {activeType === 'goal' ? '⚽' : activeType === 'penalty' ? '⚠️' : activeType === 'free_kick' ? '🎯' : activeType === 'yellow_card' ? '🟨' : '🟥'}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {activeType === 'goal'
                    ? (lang === 'pt' ? 'Registar Golo & Assistência' : 'Record Goal & Assist')
                    : activeType === 'penalty'
                    ? (lang === 'pt' ? 'Decisão de Pênalti' : 'Penalty Kick Decision')
                    : activeType === 'free_kick'
                    ? (lang === 'pt' ? 'Livre Direto' : 'Free Kick Decision')
                    : activeType === 'yellow_card'
                    ? (lang === 'pt' ? 'Cartão Amarelo' : 'Yellow Card')
                    : (lang === 'pt' ? 'Cartão Vermelho' : 'Red Card')}
                </h3>
                <p className="text-xs text-gray-300">
                  {lang === 'pt' ? `Aos ${minute}' minutos de jogo` : `At ${minute}' minute`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Type Switcher Tabs */}
          <div className="bg-gray-100 p-2 border-b border-gray-200 flex items-center gap-1 overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveType('goal')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                activeType === 'goal' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>⚽ Golo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveType('penalty')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                activeType === 'penalty' ? 'bg-amber-500 text-black shadow-xs' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>⚠️ Pênalti</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveType('free_kick')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                activeType === 'free_kick' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>🎯 Livre</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveType('yellow_card')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                activeType === 'yellow_card' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>🟨 Amarelo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveType('red_card')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                activeType === 'red_card' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>🟥 Vermelho</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* 1. Escolher a Equipa */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {lang === 'pt' ? 'Equipa envolvida no lance:' : 'Team involved:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeam('A')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedTeam === 'A'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Shield size={14} />
                  <span className="truncate">{match.teamAName || 'Equipa A'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTeam('B')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedTeam === 'B'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Shield size={14} />
                  <span className="truncate">{match.teamBName || 'Equipa B'}</span>
                </button>
              </div>
            </div>

            {/* Minuto do lance */}
            <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <span className="text-[11px] font-bold text-gray-500 uppercase">
                {lang === 'pt' ? 'Minuto do Lance:' : 'Match Minute:'}
              </span>
              <input
                type="number"
                min="1"
                max="130"
                value={minute}
                onChange={e => setMinute(parseInt(e.target.value) || 1)}
                className="w-16 p-1 text-center font-mono font-black text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <span className="text-[11px] text-gray-400 font-bold">' minutos</span>
            </div>

            {/* GOAL FORM */}
            {activeType === 'goal' && (
              <div className="space-y-3.5 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
                {/* Marcador */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span>⚽ Quem marcou o golo (Marcador):</span>
                  </label>
                  <select
                    value={selectedTakerId}
                    onChange={e => setSelectedTakerId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {teamPlayers.length === 0 ? (
                      <option value="">{lang === 'pt' ? 'Jogador da equipa' : 'Team player'}</option>
                    ) : (
                      teamPlayers.map(p => (
                        <option key={p.id || p.playerId} value={p.playerId || p.id}>
                          {p.playerName} {p.number ? `(#${p.number})` : ''} - [{p.position || 'JOG'}]
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Assistência */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span>👟 Quem fez a assistência (Passe para Golo):</span>
                  </label>
                  <select
                    value={selectedAssistId}
                    onChange={e => setSelectedAssistId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="none">
                      {lang === 'pt' ? '❌ Sem assistência (Jogada individual / Sobra de bola)' : 'No assist (Solo effort)'}
                    </option>
                    {assistCandidates.map(p => (
                      <option key={p.id || p.playerId} value={p.playerId || p.id}>
                        👟 {p.playerName} {p.number ? `(#${p.number})` : ''} - [{p.position || 'JOG'}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de golo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {lang === 'pt' ? 'Tipo de finalização:' : 'Goal type:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                    {(['open_play', 'header', 'long_range', 'penalty', 'free_kick'] as const).map(gType => (
                      <button
                        key={gType}
                        type="button"
                        onClick={() => setGoalType(gType)}
                        className={`p-2 rounded-xl border text-[11px] font-bold transition-all text-center ${
                          goalType === gType
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {gType === 'open_play' ? 'Bola corrida' : gType === 'header' ? 'Cabeceamento' : gType === 'long_range' ? 'Fora da área' : gType === 'penalty' ? 'Pênalti' : 'Livre direto'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PENALTY & FREE KICK DECISIONS */}
            {(activeType === 'penalty' || activeType === 'free_kick') && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {activeType === 'penalty' ? (lang === 'pt' ? 'Quem vai bater o Pênalti?' : 'Penalty Taker:') : (lang === 'pt' ? 'Quem vai bater o Livre?' : 'Free Kick Taker:')}
                  </label>
                  <select
                    value={selectedTakerId}
                    onChange={e => setSelectedTakerId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {teamPlayers.map(k => (
                      <option key={k.id || k.playerId} value={k.playerId || k.id}>
                        {k.playerName} {k.number ? `(#${k.number})` : ''} - [{k.position || 'JOG'}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    {lang === 'pt' ? 'Desfecho do Lance (Resultado):' : 'Outcome of the set piece:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOutcome('goal')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        outcome === 'goal'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">⚽</span>
                      <div className="text-left">
                        <span className="block font-black">{lang === 'pt' ? 'Golo Marcado!' : 'Goal Scored!'}</span>
                        <span className="text-[9px] text-gray-500">{lang === 'pt' ? 'No fundo da rede' : 'In the net'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutcome('saved')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        outcome === 'saved'
                          ? 'bg-blue-50 text-blue-900 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">🧤</span>
                      <div className="text-left">
                        <span className="block font-black">{lang === 'pt' ? 'Guarda-Redes Salvou!' : 'Goalkeeper Saved!'}</span>
                        <span className="text-[9px] text-gray-500">{lang === 'pt' ? 'Defesaça' : 'Great save'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutcome('post')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        outcome === 'post'
                          ? 'bg-amber-50 text-amber-900 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">🥅</span>
                      <div className="text-left">
                        <span className="block font-black">{lang === 'pt' ? 'Bateu na Trave!' : 'Hit the Post!'}</span>
                        <span className="text-[9px] text-gray-500">{lang === 'pt' ? 'No poste/travessão' : 'Off crossbar'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutcome('missed')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        outcome === 'missed'
                          ? 'bg-red-50 text-red-900 border-red-500 ring-2 ring-red-500/20'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">❌</span>
                      <div className="text-left">
                        <span className="block font-black">{lang === 'pt' ? 'Falhou / Fora' : 'Missed'}</span>
                        <span className="text-[9px] text-gray-500">{lang === 'pt' ? 'Remate para fora' : 'Off target'}</span>
                      </div>
                    </button>

                    {activeType === 'free_kick' && (
                      <button
                        type="button"
                        onClick={() => setOutcome('wall')}
                        className={`col-span-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          outcome === 'wall'
                            ? 'bg-gray-100 text-gray-900 border-gray-500 ring-2 ring-gray-500/20'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base">🧱</span>
                        <span className="font-black">{lang === 'pt' ? 'Bateu na Barreira' : 'Hit the Wall'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* YELLOW & RED CARDS */}
            {(activeType === 'yellow_card' || activeType === 'red_card') && (
              <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200">
                <label className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
                  {activeType === 'yellow_card'
                    ? (lang === 'pt' ? '🟨 Jogador que recebeu Cartão Amarelo:' : 'Player receiving Yellow Card:')
                    : (lang === 'pt' ? '🟥 Jogador que recebeu Cartão Vermelho:' : 'Player receiving Red Card:')}
                </label>
                <select
                  value={selectedTakerId}
                  onChange={e => setSelectedTakerId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  {teamPlayers.map(p => (
                    <option key={p.id || p.playerId} value={p.playerId || p.id}>
                      {p.playerName} {p.number ? `(#${p.number})` : ''} - [{p.position || 'JOG'}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Observação / Detalhe narrativo */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {lang === 'pt' ? 'Comentário / Detalhe da Jogada (Opcional):' : 'Commentary note (optional):'}
              </label>
              <input
                type="text"
                value={customComment}
                onChange={e => setCustomComment(e.target.value)}
                placeholder={lang === 'pt' ? 'Ex: Remate indefensável no ângulo, sem hipóteses!' : 'E.g.: Top corner finish!'}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{lang === 'pt' ? 'Registar Evento & Narrar na Partida' : 'Record & Broadcast Event'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs transition-all cursor-pointer"
              >
                {lang === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
