import React from 'react';
import { LineupPlayer } from '../types';
import { Language, PLAYER_POSITIONS } from '../constants';
import { X, AlertTriangle, ShieldAlert, Award, Footprints, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerCardActionModalProps {
  player: LineupPlayer | null;
  isOpen: boolean;
  canManage: boolean;
  lang: Language;
  onClose: () => void;
  onAddYellow: (player: LineupPlayer) => void;
  onAddRed: (player: LineupPlayer) => void;
  onRemoveCards: (player: LineupPlayer) => void;
  onAddGoal: (player: LineupPlayer) => void;
  onRemoveGoal: (player: LineupPlayer) => void;
  onAddAssist: (player: LineupPlayer) => void;
  onToggleStarter: (player: LineupPlayer) => void;
}

export function PlayerCardActionModal({
  player,
  isOpen,
  canManage,
  lang,
  onClose,
  onAddYellow,
  onAddRed,
  onRemoveCards,
  onAddGoal,
  onRemoveGoal,
  onAddAssist,
  onToggleStarter,
}: PlayerCardActionModalProps) {
  if (!isOpen || !player) return null;

  const posInfo = player.position ? PLAYER_POSITIONS[player.position] : null;
  const isExpelled = player.redCards > 0 || player.yellowCards >= 2;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-6 text-white text-center">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Avatar with Cards Indicator */}
            <div className="relative inline-block mx-auto mb-3">
              {player.playerPhoto ? (
                <img
                  src={player.playerPhoto}
                  alt={player.playerName}
                  className={`w-20 h-20 rounded-2xl object-cover border-2 shadow-md ${
                    isExpelled ? 'border-red-500 ring-4 ring-red-500/30' : 'border-white/20'
                  }`}
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center border-2 shadow-md ${
                    isExpelled ? 'border-red-500 ring-4 ring-red-500/30' : 'border-white/20'
                  }`}
                >
                  {player.playerName.substring(0, 2).toUpperCase()}
                </div>
              )}

              {/* Red card badge overlay */}
              {isExpelled && (
                <div className="absolute -bottom-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1">
                  <span>🟥</span>
                  <span>{lang === 'pt' ? 'EXPULSO' : 'RED CARD'}</span>
                </div>
              )}
            </div>

            <h3 className="text-xl font-black text-white">{player.playerName}</h3>

            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs font-bold text-gray-300">
                {player.team === 'A' ? 'Equipa A (Mandante)' : 'Equipa B (Visitante)'}
              </span>
              {player.number && (
                <span className="text-xs font-mono font-bold text-emerald-400">
                  #{player.number}
                </span>
              )}
              {posInfo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/15 text-white">
                  {posInfo.namePt}
                </span>
              )}
            </div>

            {/* Current Match Status Badges */}
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                player.isStarter ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-700 text-gray-300'
              }`}>
                {player.isStarter ? (lang === 'pt' ? '★ Onze Inicial' : '★ Starting XI') : (lang === 'pt' ? 'Suplente / Banco' : 'Substitute')}
              </span>

              {player.yellowCards > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <span>🟨</span>
                  <span>{player.yellowCards} {player.yellowCards === 1 ? 'Amarelo' : 'Amarelos'}</span>
                </span>
              )}

              {player.redCards > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                  <span>🟥</span>
                  <span>Cartão Vermelho</span>
                </span>
              )}

              {player.goals > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white flex items-center gap-1">
                  <span>⚽</span>
                  <span>{player.goals} {player.goals === 1 ? 'Gol' : 'Gols'}</span>
                </span>
              )}

              {player.assists > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 flex items-center gap-1">
                  <span>👟</span>
                  <span>{player.assists} {player.assists === 1 ? 'Assist.' : 'Assists'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Body */}
          <div className="p-6 space-y-5">
            {canManage ? (
              <>
                {/* Yellow & Red Card Section */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    {lang === 'pt' ? 'Ação Disciplinar (Cartões):' : 'Disciplinary Cards:'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Yellow Card Button */}
                    <button
                      type="button"
                      onClick={() => onAddYellow(player)}
                      className="p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      <span className="text-xl leading-none">🟨</span>
                      <div className="text-left">
                        <span className="block leading-tight">{lang === 'pt' ? 'Cartão Amarelo' : 'Yellow Card'}</span>
                        <span className="text-[10px] text-amber-700 font-medium">
                          {player.yellowCards === 0 
                            ? (lang === 'pt' ? '1º Amarelo' : '1st Yellow') 
                            : (lang === 'pt' ? '2º Amarelo (Vermelho!)' : '2nd Yellow (Red!)')}
                        </span>
                      </div>
                    </button>

                    {/* Red Card Button */}
                    <button
                      type="button"
                      onClick={() => onAddRed(player)}
                      className="p-3.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-900 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      <span className="text-xl leading-none">🟥</span>
                      <div className="text-left">
                        <span className="block leading-tight">{lang === 'pt' ? 'Cartão Vermelho' : 'Red Card'}</span>
                        <span className="text-[10px] text-red-700 font-medium">
                          {lang === 'pt' ? 'Expulsão Direta' : 'Direct Send-off'}
                        </span>
                      </div>
                    </button>
                  </div>

                  {(player.yellowCards > 0 || player.redCards > 0) && (
                    <button
                      type="button"
                      onClick={() => onRemoveCards(player)}
                      className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      {lang === 'pt' ? 'Limpar Cartões do Jogador' : 'Clear Player Cards'}
                    </button>
                  )}
                </div>

                {/* Goals & Assists Section */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    {lang === 'pt' ? 'Estatísticas na Partida:' : 'Match Events:'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => onAddGoal(player)}
                      className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <span className="text-lg">⚽</span>
                      <span>+1 Gol</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onAddAssist(player)}
                      className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <span className="text-lg">👟</span>
                      <span>+1 Assistência</span>
                    </button>
                  </div>
                </div>

                {/* Lineup Switcher: Starter vs Bench */}
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => onToggleStarter(player)}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>
                      {player.isStarter 
                        ? (lang === 'pt' ? 'Mover para Banco de Suplentes' : 'Move to Substitutes') 
                        : (lang === 'pt' ? 'Promover para Onze Inicial (Titular)' : 'Promote to Starting XI')}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-500">
                {lang === 'pt'
                  ? 'Apenas o organizador da partida ou administradores podem atribuir cartões e estatísticas.'
                  : 'Only the match organizer or admins can assign cards and match events.'}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gray-900 text-white font-bold text-xs hover:bg-black transition-all cursor-pointer"
            >
              {lang === 'pt' ? 'Fechar' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
