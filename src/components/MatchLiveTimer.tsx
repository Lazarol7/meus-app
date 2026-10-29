import React, { useEffect, useState } from 'react';
import { MatchTimer, Match } from '../types';
import { Language } from '../constants';
import { Play, Pause, Plus, Clock, Flag, RotateCcw, AlertCircle, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatchLiveTimerProps {
  timer?: MatchTimer;
  matchStatus: Match['status'];
  scoreA?: number;
  scoreB?: number;
  teamAName?: string;
  teamBName?: string;
  teamALogoURL?: string;
  teamBLogoURL?: string;
  canManage: boolean;
  lang: Language;
  onUpdateTimer: (newTimer: MatchTimer, newMatchStatus?: Match['status']) => void;
  onOpenFinishModal: () => void;
}

export function MatchLiveTimer({
  timer,
  matchStatus,
  scoreA = 0,
  scoreB = 0,
  teamAName = 'Equipa A',
  teamBName = 'Equipa B',
  teamALogoURL,
  teamBLogoURL,
  canManage,
  lang,
  onUpdateTimer,
  onOpenFinishModal,
}: MatchLiveTimerProps) {
  // Current local elapsed seconds
  const currentElapsed = timer?.elapsedSeconds || 0;
  const isRunning = timer?.status === 'running';
  const half = timer?.half || 1;
  const stoppageMinutes = timer?.stoppageMinutes || 0;

  const [localSeconds, setLocalSeconds] = useState(currentElapsed);
  const [showStoppagePicker, setShowStoppagePicker] = useState(false);

  // Sync local seconds whenever timer.elapsedSeconds changes
  useEffect(() => {
    setLocalSeconds(timer?.elapsedSeconds || 0);
  }, [timer?.elapsedSeconds]);

  // Tick timer every second when status === 'running'
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setLocalSeconds(prev => {
        const next = prev + 1;
        // Periodic sync every 15 seconds to persist in DB without hammering Firestore
        if (next % 15 === 0 && canManage && timer) {
          onUpdateTimer({
            ...timer,
            elapsedSeconds: next,
            currentMinute: Math.floor(next / 60),
            lastUpdated: Date.now(),
          });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, canManage, timer, onUpdateTimer]);

  // Calculations
  const totalMinutes = Math.floor(localSeconds / 60);
  const remainderSeconds = localSeconds % 60;
  const formattedMinutes = String(totalMinutes).padStart(2, '0');
  const formattedSeconds = String(remainderSeconds).padStart(2, '0');

  // Display minute with stoppage time notation
  const getDisplayMinute = () => {
    if (half === 1) {
      if (totalMinutes > 45) {
        const extra = totalMinutes - 45;
        return `45'+${extra}'`;
      }
      return `${Math.min(45, totalMinutes)}'`;
    } else {
      if (totalMinutes > 90) {
        const extra = totalMinutes - 90;
        return `90'+${extra}'`;
      }
      return `${Math.min(90, totalMinutes)}'`;
    }
  };

  // Actions
  const handleStart = () => {
    const newTimer: MatchTimer = {
      status: 'running',
      half: 1,
      elapsedSeconds: localSeconds,
      currentMinute: totalMinutes,
      stoppageMinutes: 0,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
    };
    onUpdateTimer(newTimer, 'in_progress');
  };

  const handlePause = () => {
    if (!timer) return;
    const newTimer: MatchTimer = {
      ...timer,
      status: 'paused',
      elapsedSeconds: localSeconds,
      currentMinute: totalMinutes,
      lastPausedAt: Date.now(),
      lastUpdated: Date.now(),
    };
    onUpdateTimer(newTimer);
  };

  const handleResume = () => {
    if (!timer) return;
    const newTimer: MatchTimer = {
      ...timer,
      status: 'running',
      elapsedSeconds: localSeconds,
      currentMinute: totalMinutes,
      lastUpdated: Date.now(),
    };
    onUpdateTimer(newTimer, 'in_progress');
  };

  const handleHalfTime = () => {
    if (!timer) return;
    const halfSeconds = Math.max(localSeconds, 45 * 60);
    const newTimer: MatchTimer = {
      ...timer,
      status: 'halftime',
      half: 1,
      elapsedSeconds: halfSeconds,
      currentMinute: 45,
      stoppageMinutes: 0,
      lastUpdated: Date.now(),
    };
    setLocalSeconds(halfSeconds);
    onUpdateTimer(newTimer);
  };

  const handleStartSecondHalf = () => {
    const startSecs = Math.max(localSeconds, 45 * 60);
    const newTimer: MatchTimer = {
      status: 'running',
      half: 2,
      elapsedSeconds: startSecs,
      currentMinute: 45,
      stoppageMinutes: 0,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
    };
    setLocalSeconds(startSecs);
    onUpdateTimer(newTimer, 'in_progress');
  };

  const handleAddStoppage = (minsToAdd: number) => {
    if (!timer) return;
    const newStoppage = stoppageMinutes + minsToAdd;
    const newTimer: MatchTimer = {
      ...timer,
      stoppageMinutes: newStoppage,
      lastUpdated: Date.now(),
    };
    onUpdateTimer(newTimer);
    setShowStoppagePicker(false);
  };

  const handleResetTimer = () => {
    if (!window.confirm(lang === 'pt' ? 'Deseja reiniciar o relógio para 00:00?' : 'Reset match clock to 00:00?')) return;
    const newTimer: MatchTimer = {
      status: 'stopped',
      half: 1,
      elapsedSeconds: 0,
      currentMinute: 0,
      stoppageMinutes: 0,
      lastUpdated: Date.now(),
    };
    setLocalSeconds(0);
    onUpdateTimer(newTimer, 'open');
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-emerald-950 text-white rounded-3xl p-5 md:p-6 border border-white/10 shadow-xl space-y-5 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / League / Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            {isRunning ? (lang === 'pt' ? 'Partida Ao Vivo' : 'Live Match') : 
             timer?.status === 'halftime' ? (lang === 'pt' ? 'Intervalo' : 'Half-Time') :
             matchStatus === 'finished' ? (lang === 'pt' ? 'Finalizada' : 'Finished') :
             (lang === 'pt' ? 'Cronómetro Oficial (90 min)' : 'Official Clock (90 min)')}
          </span>
        </div>

        {/* Half Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/10">
            {timer?.status === 'halftime' ? '⏸ Intervalo' : 
             half === 1 ? '1º Tempo' : '2º Tempo'}
          </span>
          {stoppageMinutes > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-gray-950 border border-amber-300 animate-bounce">
              +{stoppageMinutes}' {lang === 'pt' ? 'Acréscimos' : 'Extra'}
            </span>
          )}
        </div>
      </div>

      {/* Main Scoreboard & Big Digital Timer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Team A */}
        <div className="md:col-span-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold overflow-hidden shadow-md shrink-0 border border-white/20">
            {teamALogoURL ? (
              <img src={teamALogoURL} alt={teamAName} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 block tracking-wider">Mandante</span>
            <h4 className="font-extrabold text-base text-white truncate">{teamAName}</h4>
          </div>
        </div>

        {/* Center Clock & Score */}
        <div className="md:col-span-4 text-center py-2 px-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex flex-col items-center justify-center">
          {/* Live Score */}
          <div className="text-3xl font-black tracking-tight text-white mb-1">
            <span>{scoreA}</span>
            <span className="text-gray-400 font-normal mx-2">-</span>
            <span>{scoreB}</span>
          </div>

          {/* Clock Display */}
          <div className="flex items-baseline justify-center gap-2">
            <div className="text-4xl md:text-5xl font-mono font-black text-emerald-300 tracking-wider">
              {formattedMinutes}:{formattedSeconds}
            </div>
            <div className="text-xs font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
              {getDisplayMinute()}
            </div>
          </div>
        </div>

        {/* Team B */}
        <div className="md:col-span-4 flex items-center justify-end gap-3 text-right">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase font-bold text-blue-400 block tracking-wider">Visitante</span>
            <h4 className="font-extrabold text-base text-white truncate">{teamBName}</h4>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold overflow-hidden shadow-md shrink-0 border border-white/20">
            {teamBLogoURL ? (
              <img src={teamBLogoURL} alt={teamBName} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-6 h-6 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Match Controls (Organizer / Admin) */}
      {canManage && (
        <div className="pt-3 border-t border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {lang === 'pt' ? 'Controlo do Jogo:' : 'Match Operations:'}
            </span>

            {/* Stoppage Time Quick Pill */}
            <button
              type="button"
              onClick={() => setShowStoppagePicker(!showStoppagePicker)}
              className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-bold border border-amber-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clock size={13} />
              <span>{lang === 'pt' ? '+ Acréscimos de Tempo' : '+ Stoppage Time'}</span>
            </button>
          </div>

          {/* Stoppage Time Picker Dropdown */}
          {showStoppagePicker && (
            <div className="p-3 bg-black/40 rounded-2xl border border-amber-400/30 space-y-2 animate-fade-in">
              <span className="text-[11px] font-bold text-amber-300 block">
                {lang === 'pt' ? 'Adicionar minutos de acréscimo (Stoppage Time):' : 'Add added stoppage minutes:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 7, 10].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleAddStoppage(mins)}
                    className="px-3 py-2 rounded-xl bg-amber-400 text-gray-950 font-black text-xs hover:bg-amber-300 active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    +{mins}'
                  </button>
                ))}
                {stoppageMinutes > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!timer) return;
                      onUpdateTimer({ ...timer, stoppageMinutes: 0 });
                      setShowStoppagePicker(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all cursor-pointer"
                  >
                    {lang === 'pt' ? 'Zerar' : 'Clear'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Start / Pause / Resume */}
            {!timer || timer.status === 'stopped' ? (
              <button
                type="button"
                onClick={handleStart}
                className="col-span-2 sm:col-span-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Play size={15} fill="currentColor" />
                <span>{lang === 'pt' ? 'Iniciar Jogo' : 'Start Match'}</span>
              </button>
            ) : isRunning ? (
              <button
                type="button"
                onClick={handlePause}
                className="py-3 px-4 bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Pause size={15} fill="currentColor" />
                <span>{lang === 'pt' ? 'Pausar' : 'Pause'}</span>
              </button>
            ) : timer.status === 'paused' ? (
              <button
                type="button"
                onClick={handleResume}
                className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Play size={15} fill="currentColor" />
                <span>{lang === 'pt' ? 'Retomar' : 'Resume'}</span>
              </button>
            ) : null}

            {/* Halftime or 2nd Half */}
            {half === 1 && timer && timer.status !== 'halftime' && (
              <button
                type="button"
                onClick={handleHalfTime}
                className="py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Clock size={14} />
                <span>{lang === 'pt' ? 'Intervalo (45\')' : 'Halftime (45\')'}</span>
              </button>
            )}

            {(timer?.status === 'halftime' || (half === 1 && totalMinutes >= 45)) && (
              <button
                type="button"
                onClick={handleStartSecondHalf}
                className="py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
              >
                <Play size={14} fill="currentColor" />
                <span>{lang === 'pt' ? 'Iniciar 2º Tempo' : 'Start 2nd Half'}</span>
              </button>
            )}

            {/* Finish Match */}
            <button
              type="button"
              onClick={onOpenFinishModal}
              className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
            >
              <Flag size={14} />
              <span>{lang === 'pt' ? 'Finalizar Partida' : 'Finish Match'}</span>
            </button>

            {/* Reset clock */}
            <button
              type="button"
              onClick={handleResetTimer}
              className="py-3 px-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="Resetar tempo para 00:00"
            >
              <RotateCcw size={13} />
              <span>{lang === 'pt' ? 'Zerar' : 'Reset'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
