import React, { useState, useEffect, useRef } from 'react';
import { Match, UserProfile, LiveTicket, CommunityAd, MatchLiveEvent, LiveChatMessage } from '../types';
import { Language } from '../constants';
import { 
  Video, VideoOff, Users, DollarSign, X, Shield, Sparkles, 
  Play, CheckCircle2, AlertTriangle, MessageCircle, Phone, 
  FlipHorizontal, Volume2, VolumeX, Eye, Megaphone, Flag, Radio, Copy, Check,
  Send, Smartphone, Monitor, Link, Upload, Zap, Sun, MessageSquare, ChevronDown,
  ChevronUp, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { SetPieceDecisionModal, LiveModalEventType } from './SetPieceDecisionModal';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';

interface MatchLiveStreamModalProps {
  isOpen: boolean;
  match: Match;
  currentUser: UserProfile;
  tickets: LiveTicket[];
  ads: CommunityAd[];
  lang: Language;
  onClose: () => void;
  onStartLive: (price: number) => Promise<void> | void;
  onStopLive: () => Promise<void> | void;
  onBuyTicket: (amount: number, method: 'mpesa' | 'emola' | 'card') => Promise<void> | void;
  onJoinViewer: () => void;
  onLeaveViewer: () => void;
  onSaveLiveEvent: (event: Omit<MatchLiveEvent, 'id' | 'createdAt'>) => void;
  allMatches?: Match[];
  onSwitchLiveMatch?: (matchId: string) => void;
}

export type FilmingSource = 'phone_rear' | 'phone_front' | 'screen' | 'stream_url' | 'video_file';

export function MatchLiveStreamModal({
  isOpen,
  match,
  currentUser,
  tickets,
  ads,
  lang,
  onClose,
  onStartLive,
  onStopLive,
  onBuyTicket,
  onJoinViewer,
  onLeaveViewer,
  onSaveLiveEvent,
  allMatches = [],
  onSwitchLiveMatch,
}: MatchLiveStreamModalProps) {
  const isAdmin = currentUser.role === 'admin' || 
    currentUser.email === 'lazaroatalia80@gmail.com' ||
    currentUser.email === 'lazaratala80@gmail.com';
  const isOrganizer = match.organizerId === currentUser.uid || isAdmin;

  // Other simultaneous live matches
  const otherLiveMatches = allMatches.filter(m => m.id !== match.id && m.liveStream?.isLive);

  // Broadcaster state
  const isLiveActive = match.liveStream?.isLive || false;
  const isCurrentBroadcaster = match.liveStream?.broadcasterId === currentUser.uid;

  // Video references & streams
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Filming Source selector
  const [filmingSource, setFilmingSource] = useState<FilmingSource>('phone_rear');
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [qualityMode, setQualityMode] = useState<'sd' | 'hd'>('sd'); // 'sd' saves mobile data in Mozambique
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);

  // Live setup form
  const [ticketPriceInput, setTicketPriceInput] = useState<number>(match.liveStream?.price ?? 20);
  const [isStarting, setIsStarting] = useState(false);

  // Chat state
  const [showChat, setShowChat] = useState(true);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Spectator ticket check
  const hasPurchasedTicket = tickets.some(t => t.matchId === match.id && t.userId === currentUser.uid) ||
    (currentUser.purchasedLiveMatchIds?.includes(match.id)) ||
    (currentUser.accountStatus === 'paid' && currentUser.hasLiveAccess);
  // Free for Admin, Broadcaster, or Match Organizer
  const hasFreeAccess = isAdmin || isOrganizer || isCurrentBroadcaster;
  const hasAccess = hasFreeAccess || hasPurchasedTicket || (match.liveStream?.price === 0);

  // Paywall payment state
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'emola' | 'card'>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const handleCopyNumber = (num: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2500);
    }
  };

  // Trigger Live Events / Set Piece Modal during live
  const [setPieceModalType, setSetPieceModalType] = useState<LiveModalEventType | null>(null);

  // Active sponsored ad for the live ticker
  const activeAd = ads.find(a => a.active) || ads[0] || null;

  // Real-time Live Chat Listener
  useEffect(() => {
    if (!isOpen || !match.id) return;

    try {
      const q = query(
        collection(db, 'live_chat'),
        where('matchId', '==', match.id)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const msgs: LiveChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            msgs.push({
              id: docSnap.id,
              matchId: data.matchId,
              userId: data.userId,
              userName: data.userName,
              userPhoto: data.userPhoto,
              text: data.text,
              badge: data.badge,
              createdAt: data.createdAt || 0,
            });
          });
          // Sort chronologically
          msgs.sort((a, b) => a.createdAt - b.createdAt);
          setChatMessages(msgs);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'live_chat');
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Erro ao conectar ao chat ao vivo:', err);
    }
  }, [isOpen, match.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (showChat && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  // Send message to Live Chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInputText).trim();
    if (!text || isSendingChat) return;

    setIsSendingChat(true);
    try {
      const roleBadge = isAdmin ? 'admin' : isCurrentBroadcaster ? 'broadcaster' : 'spectator';
      await addDoc(collection(db, 'live_chat'), {
        matchId: match.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Adepto',
        userPhoto: currentUser.photoURL || null,
        text: text.slice(0, 300),
        badge: roleBadge,
        createdAt: Date.now(),
      });
      if (!textToSend) {
        setChatInputText('');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem no chat ao vivo:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Quick Soccer Reaction Emojis
  const quickReactions = [
    { label: '⚽ Golo!', emoji: '⚽', text: '⚽ GOLOOOOOOO!' },
    { label: '🔥 Craque!', emoji: '🔥', text: '🔥 Que jogada de craque!' },
    { label: '👏 Boa!', emoji: '👏', text: '👏 Grande jogada!' },
    { label: '🧤 Defesa!', emoji: '🧤', text: '🧤 Que grande defesa!' },
    { label: '🟨 Falta!', emoji: '🟨', text: '🟨 Cartão Amarelo / Falta feia!' },
    { label: '🟥 Vermelho!', emoji: '🟥', text: '🟥 Cartão Vermelho!' },
    { label: '🏆 Campeão!', emoji: '🏆', text: '🏆 Vamos ser campeões!' },
    { label: '⚡ Pressão!', emoji: '⚡', text: '⚡ Acelera a jogada!' },
  ];

  // Stop active camera/screen track
  const stopCurrentStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      setMediaStream(null);
    }
    setTorchOn(false);
    setHasTorchSupport(false);
  };

  // Start selected camera or screen stream
  const initializeStream = async (source: FilmingSource) => {
    if (!hasAccess) return;
    setCameraError(null);
    stopCurrentStream();

    try {
      if (source === 'phone_rear' || source === 'phone_front') {
        const facing = source === 'phone_rear' ? 'environment' : 'user';
        const resolution = qualityMode === 'hd' ? { width: 1280, height: 720 } : { width: 854, height: 480 };

        let stream: MediaStream;
        try {
          // Attempt exact constraints first
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing },
              ...resolution,
            },
            audio: true,
          });
        } catch (strictErr) {
          // Fallback to simpler constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: true,
          });
        }

        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check torch capabilities on back camera
        if (source === 'phone_rear') {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
            if (capabilities && 'torch' in capabilities) {
              setHasTorchSupport(true);
            }
          }
        }
      } else if (source === 'screen') {
        // Screen capture / scoreboard broadcast
        if (navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
          setMediaStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          setCameraError('A partilha de ecrã não é suportada neste navegador.');
        }
      }
    } catch (err: any) {
      console.warn('Erro ao aceder à fonte de filmagem:', err);
      setCameraError('Permissão de câmara negada ou fonte indisponível. A transmissão visual simulada em direto está ativa.');
    }
  };

  // Toggle mobile torch / lanterna
  const handleToggleTorch = async () => {
    if (!mediaStream) return;
    const track: any = mediaStream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch não suportada ou erro ao aplicar:', err);
    }
  };

  // Handle local video file upload for streaming
  const handleVideoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCurrentStream();
      const url = URL.createObjectURL(file);
      setLocalVideoUrl(url);
      setFilmingSource('video_file');
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.play().catch(console.warn);
      }
    }
  };

  // Apply custom stream URL
  const handleApplyCustomStreamUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStreamUrl.trim()) {
      stopCurrentStream();
      setActiveStreamUrl(customStreamUrl.trim());
      setFilmingSource('stream_url');
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = customStreamUrl.trim();
        videoRef.current.play().catch(console.warn);
      }
    }
  };

  // Start or change video source
  useEffect(() => {
    if (!isOpen) return;

    if (hasAccess && (isCurrentBroadcaster || (isOrganizer && !isLiveActive))) {
      if (filmingSource === 'phone_rear' || filmingSource === 'phone_front' || filmingSource === 'screen') {
        initializeStream(filmingSource);
      }
    }

    return () => {
      stopCurrentStream();
    };
  }, [isOpen, filmingSource, qualityMode, isCurrentBroadcaster, hasAccess, isOrganizer, isLiveActive]);

  // Track viewer joining
  useEffect(() => {
    if (isOpen && hasAccess && !isCurrentBroadcaster) {
      onJoinViewer();
      return () => {
        onLeaveViewer();
      };
    }
  }, [isOpen, hasAccess, isCurrentBroadcaster]);

  const handleStartBroadcast = async () => {
    setIsStarting(true);
    try {
      await onStartLive(Number(ticketPriceInput) || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopBroadcast = async () => {
    if (window.confirm(lang === 'pt' ? 'Deseja encerrar a transmissão ao vivo?' : 'Stop live stream?')) {
      stopCurrentStream();
      await onStopLive();
    }
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      await onBuyTicket(match.liveStream?.price || ticketPriceInput, selectedMethod);
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!isOpen) return null;

  // Viewers count: minimum 1 if broadcaster, or the real count
  const viewerCount = Math.max(match.liveStream?.viewerCount || 0, isLiveActive ? 1 : 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-black/95 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="relative bg-neutral-950 w-full max-w-6xl h-[95vh] max-h-[900px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between"
        >
          {/* TOP FLOATING HEADER BAR */}
          <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-auto">
            {/* Live Indicator & Viewers */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>{lang === 'pt' ? 'EM DIRETO' : 'LIVE'}</span>
              </div>

              {/* Viewers Counter */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono font-bold text-xs border border-white/10 shadow-sm">
                <Users size={14} className="text-emerald-400" />
                <span>{viewerCount} {viewerCount === 1 ? 'espectador' : 'espectadores'}</span>
              </div>

              {/* Free Access badge for Admins & Broadcaster */}
              {hasFreeAccess && (
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isAdmin ? '👑 Admin (Gratuito)' : '🎥 Transmissor'}
                </span>
              )}

              {/* Camera Source indicator when broadcasting */}
              {isOrganizer && (
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-neutral-300 border border-white/10">
                  <Smartphone size={11} className="text-emerald-400" />
                  {filmingSource === 'phone_rear' ? 'Câmara Traseira (Campo)' :
                   filmingSource === 'phone_front' ? 'Câmara Frontal (Selfie)' :
                   filmingSource === 'screen' ? 'Ecrã / App Externa' :
                   filmingSource === 'stream_url' ? 'Link de Stream' : 'Ficheiro de Vídeo'}
                </span>
              )}
            </div>

            {/* Score & Match Time Overlay */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-bold text-xs">
              <span className="text-emerald-400">{match.teamAName || 'Equipa A'}</span>
              <span className="font-mono font-black text-sm text-white px-2 py-0.5 rounded-md bg-white/10">
                {match.scoreA ?? 0} - {match.scoreB ?? 0}
              </span>
              <span className="text-blue-400">{match.teamBName || 'Equipa B'}</span>
              {match.timer && (
                <span className="font-mono text-amber-300 ml-1">
                  {match.timer.currentMinute}'
                </span>
              )}
            </div>

            {/* Action buttons: Chat toggle & Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowChat(!showChat)}
                className={cn(
                  "p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md border",
                  showChat 
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md" 
                    : "bg-black/60 text-neutral-300 hover:text-white border-white/10 hover:bg-white/20"
                )}
                title="Alternar Chat Ao Vivo"
              >
                <MessageSquare size={15} />
                <span className="hidden sm:inline">Chat</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono">
                  {chatMessages.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCurrentStream();
                  onClose();
                }}
                className="p-2 sm:p-2.5 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MAIN BODY: SPLIT VIEW (VIDEO STREAM + LIVE CHAT) */}
          <div className="relative flex-1 w-full flex flex-col md:flex-row overflow-hidden bg-black">
            
            {/* VIDEO PLAYER SECTION */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              {/* Other simultaneous live matches switcher */}
              {otherLiveMatches.length > 0 && onSwitchLiveMatch && (
                <div className="absolute top-16 right-4 z-20 max-w-xs bg-neutral-950/85 backdrop-blur-md border border-neutral-700 rounded-2xl p-2.5 shadow-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-rose-400">
                      <Radio size={10} className="animate-pulse" /> Outro Jogo Ao Vivo
                    </span>
                    <span>{otherLiveMatches.length} em direto</span>
                  </div>
                  <div className="space-y-1">
                    {otherLiveMatches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          stopCurrentStream();
                          onSwitchLiveMatch(m.id);
                        }}
                        className="w-full text-left p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white flex items-center justify-between gap-2 transition-all cursor-pointer border border-neutral-800"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold truncate">
                            {m.teamAName || 'Equipa A'} vs {m.teamBName || 'Equipa B'}
                          </p>
                          <p className="text-[9px] text-neutral-400 font-mono">
                            {m.liveStream?.viewerCount || 0} espectadores
                          </p>
                        </div>
                        <span className="text-[10px] bg-rose-600 text-white font-mono font-bold px-1.5 py-0.5 rounded-md">
                          {m.scoreA ?? 0}:{m.scoreB ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Strictly check hasAccess before displaying video or camera feed */}
              {hasAccess ? (
                /* AUTHORIZED VIEW: REAL CAMERA, URL OR SIMULATION */
                mediaStream && !cameraError ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isMuted || isCurrentBroadcaster}
                    className="w-full h-full object-cover"
                  />
                ) : activeStreamUrl || localVideoUrl ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    controls
                    muted={isMuted}
                    src={activeStreamUrl || localVideoUrl || undefined}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  /* High-fidelity Soccer Match Broadcast Visual Field */
                  <div className="relative w-full h-full bg-gradient-to-b from-emerald-950 via-emerald-900 to-gray-950 flex flex-col items-center justify-center text-center p-6 overflow-hidden select-none">
                    {/* Visual Grass Stripes & Stadium Atmosphere */}
                    <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,#000_0px,#000_40px,transparent_40px,transparent_80px)] pointer-events-none" />
                    <div className="absolute top-10 left-10 w-44 h-44 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-10 right-10 w-44 h-44 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Animated Stadium Center Display */}
                    <div className="relative z-10 space-y-4 max-w-md mx-auto">
                      <div className="w-20 h-20 rounded-3xl bg-emerald-600/30 border-2 border-emerald-400 flex items-center justify-center mx-auto text-white shadow-2xl animate-pulse">
                        <Video size={36} className="text-emerald-400" />
                      </div>

                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-white">
                          {match.teamAName || 'Equipa A'} <span className="text-emerald-400">VS</span> {match.teamBName || 'Equipa B'}
                        </h3>
                        <p className="text-xs text-emerald-300 font-mono mt-1">
                          {match.location.address} · Transmissão Be-Lwezer
                        </p>
                      </div>

                      {cameraError && isOrganizer && (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-xs text-amber-200">
                          {cameraError}
                        </div>
                      )}

                      {!isLiveActive && isOrganizer && (
                        <div className="p-3 bg-neutral-900/90 rounded-2xl border border-white/10 text-xs text-neutral-300 space-y-1">
                          <p className="font-bold text-white">Pronto para filmar o jogo?</p>
                          <p className="text-[11px] text-neutral-400">
                            Aponte a câmara do telemóvel para o campo e clique em "Iniciar Transmissão Ao Vivo" abaixo.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                /* LOCKED PAYWALL SCREEN: VIDEO FEED IS BLOCKED BEFORE PAYMENT */
                <div className="w-full h-full bg-neutral-950 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 text-gray-900 shadow-2xl border border-gray-100 space-y-5 text-center animate-scale-up">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                      <DollarSign size={28} />
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        🔒 Feed de Vídeo Bloqueado
                      </span>
                      <h3 className="text-xl font-black text-gray-900 mt-2">
                        {lang === 'pt' ? 'Acesso à Transmissão em Direto' : 'Watch Live Match'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {lang === 'pt'
                          ? 'O sinal de vídeo desta partida é exclusivo para portadores de bilhete. Confirme o pagamento via Mobile Money para desbloquear a live.'
                          : 'Pay the ticket fee to access the exclusive live broadcast.'}
                      </p>
                    </div>

                    {/* Price Banner */}
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">
                        {lang === 'pt' ? 'Valor do Bilhete Live:' : 'Live Ticket Price:'}
                      </span>
                      <span className="text-2xl font-black text-emerald-700 font-mono">
                        {(match.liveStream?.price ?? ticketPriceInput).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                      </span>
                    </div>

                    {/* Payment form */}
                    <form onSubmit={handleSimulatePayment} className="space-y-3 text-left">
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                        {lang === 'pt' ? 'Método de Pagamento Móvel (Moçambique):' : 'Payment Method:'}
                      </label>

                      <div className="grid grid-cols-3 gap-2">
                        {(['mpesa', 'emola', 'card'] as const).map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setSelectedMethod(method)}
                            className={cn(
                              "py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center uppercase cursor-pointer",
                              selectedMethod === method
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                            )}
                          >
                            {method === 'mpesa' ? 'M-Pesa' : method === 'emola' ? 'e-Mola' : 'Cartão'}
                          </button>
                        ))}
                      </div>

                      {/* Official Numbers for Payment */}
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                            {lang === 'pt' ? 'Número para Transferência / Pagamento:' : 'Send Payment To:'}
                          </span>
                          <span className="text-[9px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            Titular: Lázaro Atalia
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* e-Mola (Movitel) */}
                          <div className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-between transition-all",
                            selectedMethod === 'emola'
                              ? "bg-amber-50 border-amber-300 ring-1 ring-amber-400"
                              : "bg-white border-gray-200"
                          )}>
                            <div>
                              <div className="text-[10px] uppercase font-bold text-amber-700">e-Mola (Movitel)</div>
                              <div className="font-mono font-black text-sm text-gray-900">87 88 030 93</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyNumber('878803093')}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                              title="Copiar número"
                            >
                              {copiedNumber === '878803093' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                          </div>

                          {/* M-Pesa (Vodacom) */}
                          <div className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-between transition-all",
                            selectedMethod === 'mpesa'
                              ? "bg-red-50 border-red-300 ring-1 ring-red-400"
                              : "bg-white border-gray-200"
                          )}>
                            <div>
                              <div className="text-[10px] uppercase font-bold text-red-700">M-Pesa (Vodacom)</div>
                              <div className="font-mono font-black text-sm text-gray-900">85 619 79 09</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyNumber('856197909')}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                              title="Copiar número"
                            >
                              {copiedNumber === '856197909' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
                          <span>{lang === 'pt' ? 'O Seu Número de Telefone (de onde vai pagar)' : 'Your Phone Number'}</span>
                          <span className="text-emerald-600 font-mono text-[9px]">
                            {selectedMethod === 'mpesa' ? 'Vodacom (84/85)' : selectedMethod === 'emola' ? 'Movitel (86/87)' : ''}
                          </span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          placeholder="84 123 4567"
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessingPayment}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isProcessingPayment ? (
                          <span>{lang === 'pt' ? 'A validar pagamento com operadora...' : 'Processing...'}</span>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>{lang === 'pt' ? 'Pagar & Desbloquear Vídeo' : 'Pay & Watch Live'}</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* LIVE EVENT BANNER OVERLAY (GOLO, PÊNALTI, CARTÕES) */}
              {match.liveEvents && match.liveEvents.length > 0 && (
                <div className="absolute top-16 left-4 right-4 z-20 pointer-events-none">
                  {match.liveEvents.slice(-1).map(ev => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="p-3 bg-black/90 backdrop-blur-md rounded-2xl border border-white/20 text-white max-w-lg mx-auto shadow-2xl flex items-center gap-3"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center shrink-0 shadow-md",
                        ev.type === 'goal' ? "bg-emerald-500 text-white" :
                        ev.type === 'penalty' ? "bg-amber-500 text-gray-950" :
                        ev.type === 'free_kick' ? "bg-blue-600 text-white" :
                        ev.type === 'yellow_card' ? "bg-yellow-400 text-gray-950" :
                        ev.type === 'red_card' ? "bg-rose-600 text-white" : "bg-emerald-500 text-white"
                      )}>
                        {ev.type === 'goal' ? '⚽' :
                         ev.type === 'penalty' ? '⚠️' :
                         ev.type === 'free_kick' ? '🎯' :
                         ev.type === 'yellow_card' ? '🟨' :
                         ev.type === 'red_card' ? '🟥' : '⚽'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase font-black">
                            {ev.minute}' Minuto
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {ev.teamName}
                          </span>
                          {ev.assistantName && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold truncate">
                              👟 Passe: {ev.assistantName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-extrabold text-white truncate mt-0.5">
                          {ev.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* LIVE CHAT SIDE PANEL */}
            {showChat && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full md:w-80 lg:w-96 h-56 md:h-auto bg-neutral-900/95 border-t md:border-t-0 md:border-l border-white/10 flex flex-col justify-between shrink-0 z-20"
              >
                {/* Chat Header */}
                <div className="p-3 bg-neutral-950/80 border-b border-white/10 flex items-center justify-between text-xs font-bold text-white">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-emerald-400" />
                    <span>Chat Ao Vivo</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30">
                      Sincronizado
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {chatMessages.length} msgs
                  </span>
                </div>

                {/* Chat Messages Feed */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-500 space-y-2">
                      <MessageCircle size={28} className="text-neutral-600" />
                      <p className="text-xs font-bold text-neutral-400">O chat está pronto!</p>
                      <p className="text-[11px] text-neutral-500">
                        Envie uma mensagem ou apoie a sua equipa com reações futebolísticas em baixo.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.userId === currentUser.uid;
                      const isMsgAdmin = msg.badge === 'admin' || msg.userName?.includes('Admin');
                      const isMsgBroadcaster = msg.badge === 'broadcaster';

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "p-2.5 rounded-2xl max-w-[90%] transition-all",
                            isMe 
                              ? "ml-auto bg-emerald-950/70 border border-emerald-500/40 text-emerald-100" 
                              : "mr-auto bg-neutral-950/80 border border-neutral-800 text-neutral-200"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-extrabold text-[11px] truncate text-white">
                                {isMe ? 'Tu' : msg.userName}
                              </span>
                              {isMsgAdmin && (
                                <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-black shrink-0">
                                  👑 Admin
                                </span>
                              )}
                              {isMsgBroadcaster && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded font-black shrink-0">
                                  🎥 Direto
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-neutral-500 shrink-0">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs break-words font-medium">
                            {msg.text}
                          </p>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Emoji Reaction Buttons */}
                <div className="p-2 bg-neutral-950 border-t border-white/5 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
                  {quickReactions.map((qr) => (
                    <button
                      key={qr.label}
                      type="button"
                      onClick={() => handleSendMessage(qr.text)}
                      disabled={isSendingChat}
                      className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer"
                      title={qr.text}
                    >
                      <span>{qr.emoji}</span>
                      <span>{qr.label}</span>
                    </button>
                  ))}
                </div>

                {/* Chat Input Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-2.5 bg-neutral-950 border-t border-white/10 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Comentar na live..."
                    maxLength={300}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInputText.trim() || isSendingChat}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-all cursor-pointer shadow-md"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </motion.div>
            )}
          </div>

          {/* SPONSORED ADS TICKER (at bottom of live player) */}
          {activeAd && (
            <div className="z-20 bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 border-t border-white/10 px-4 py-2 flex items-center justify-between gap-3 text-xs text-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-400 text-gray-950">
                  Patrocinador
                </span>
                <span className="font-extrabold text-emerald-300 truncate">
                  {activeAd.businessName}:
                </span>
                <span className="text-gray-300 truncate">
                  {activeAd.title}
                </span>
              </div>

              {activeAd.whatsapp && (
                <a
                  href={`https://wa.me/${activeAd.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shrink-0"
                >
                  <MessageCircle size={11} />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          )}

          {/* BOTTOM CONTROLS BAR */}
          <div className="z-30 p-3 sm:p-4 bg-gradient-to-t from-black via-neutral-950 to-neutral-900/90 border-t border-white/10 space-y-2.5 shrink-0">
            {/* Broadcaster / Organizer Live Controls */}
            {isOrganizer ? (
              <div className="space-y-2.5">
                {/* Advanced Filming Options Dropdown */}
                {showSourceSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-neutral-900 rounded-2xl border border-neutral-700 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Smartphone size={14} className="text-emerald-400" />
                        Opções de Filmagem da Live
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSourceSelector(false)}
                        className="text-neutral-400 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Source Selection Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFilmingSource('phone_rear');
                          setShowSourceSelector(false);
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                          filmingSource === 'phone_rear'
                            ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-1 font-bold">
                          <Smartphone size={14} />
                          <span>Câmara Traseira</span>
                        </div>
                        <span className="text-[10px] text-neutral-500">Filmar o campo do jogo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilmingSource('phone_front');
                          setShowSourceSelector(false);
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                          filmingSource === 'phone_front'
                            ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-1 font-bold">
                          <FlipHorizontal size={14} />
                          <span>Câmara Frontal</span>
                        </div>
                        <span className="text-[10px] text-neutral-500">Comentador / Selfie</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilmingSource('screen');
                          setShowSourceSelector(false);
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                          filmingSource === 'screen'
                            ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-1 font-bold">
                          <Monitor size={14} />
                          <span>Partilha Ecrã</span>
                        </div>
                        <span className="text-[10px] text-neutral-500">Scoreboard / App externa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                          filmingSource === 'video_file'
                            ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-1 font-bold">
                          <Upload size={14} />
                          <span>Vídeo Gravado</span>
                        </div>
                        <span className="text-[10px] text-neutral-500">Enviar clipe do ficheiro</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoFileSelected}
                    />

                    {/* Stream URL Input option */}
                    <form onSubmit={handleApplyCustomStreamUrl} className="flex items-center gap-2 pt-1 border-t border-neutral-800">
                      <Link size={14} className="text-neutral-500 shrink-0" />
                      <input
                        type="url"
                        placeholder="Link externo de stream (HLS .m3u8 ou MP4 direto)..."
                        value={customStreamUrl}
                        onChange={(e) => setCustomStreamUrl(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Conectar URL
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* Live Setup if not yet started */}
                {!isLiveActive ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={16} className="text-amber-400" />
                        <span className="text-xs text-gray-300 font-bold">
                          Bilhete (MZN):
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={ticketPriceInput}
                          onChange={e => setTicketPriceInput(parseInt(e.target.value) || 0)}
                          className="w-20 p-2 bg-black border border-white/20 rounded-xl text-xs font-bold text-white text-center focus:ring-2 focus:ring-emerald-500"
                          placeholder="20"
                        />
                      </div>

                      {/* Quality mode selector for mobile network savings */}
                      <button
                        type="button"
                        onClick={() => setQualityMode(prev => prev === 'sd' ? 'hd' : 'sd')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
                          qualityMode === 'sd' 
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        )}
                        title="Alternar qualidade e economia de dados"
                      >
                        <Zap size={12} />
                        <span>{qualityMode === 'sd' ? 'Poupança Dados (480p)' : 'Alta Qualidade (720p)'}</span>
                      </button>

                      {/* Filming options button */}
                      <button
                        type="button"
                        onClick={() => setShowSourceSelector(!showSourceSelector)}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Smartphone size={12} className="text-emerald-400" />
                        <span>Modo Câmara</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartBroadcast}
                      disabled={isStarting}
                      className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Video size={16} />
                      <span>{isStarting ? (lang === 'pt' ? 'A Iniciar...' : 'Starting...') : (lang === 'pt' ? 'Iniciar Transmissão Ao Vivo' : 'Start Live Broadcast')}</span>
                    </button>
                  </div>
                ) : (
                  /* Ongoing Live Controls for Broadcaster */
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Flip Camera between rear and front */}
                      <button
                        type="button"
                        onClick={() => setFilmingSource(prev => prev === 'phone_rear' ? 'phone_front' : 'phone_rear')}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Virar Câmara (Traseira / Frontal)"
                      >
                        <FlipHorizontal size={14} />
                        <span className="hidden sm:inline">Virar Câmara</span>
                      </button>

                      {/* Torch / Lanterna Toggle for phone rear camera */}
                      {hasTorchSupport && (
                        <button
                          type="button"
                          onClick={handleToggleTorch}
                          className={cn(
                            "p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer",
                            torchOn ? "bg-amber-400 text-neutral-950 font-black" : "bg-white/10 hover:bg-white/20 text-white"
                          )}
                          title="Ligar Lanterna / Flash do Telemóvel"
                        >
                          <Sun size={14} />
                          <span className="hidden sm:inline">{torchOn ? 'Flash Ligado' : 'Flash / Luz'}</span>
                        </button>
                      )}

                      {/* Mute toggle */}
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        <span className="hidden sm:inline">{isMuted ? 'Mudo' : 'Som'}</span>
                      </button>

                      {/* Source options button */}
                      <button
                        type="button"
                        onClick={() => setShowSourceSelector(!showSourceSelector)}
                        className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mais opções de câmara"
                      >
                        <Smartphone size={14} className="text-emerald-400" />
                        <span className="hidden sm:inline">Opções</span>
                      </button>
                    </div>

                    {/* Quick Live Events Buttons: Golo, Pênalti, Livre, Cartão */}
                    <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setSetPieceModalType('goal')}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                        title="Registar Golo e Assistência"
                      >
                        <span>⚽</span>
                        <span>{lang === 'pt' ? 'Golo!' : 'Goal!'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSetPieceModalType('penalty')}
                        className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                      >
                        <span>⚠️</span>
                        <span>{lang === 'pt' ? 'Pênalti!' : 'Penalty!'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSetPieceModalType('free_kick')}
                        className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                      >
                        <span>🎯</span>
                        <span>{lang === 'pt' ? 'Livre!' : 'Free Kick!'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSetPieceModalType('yellow_card')}
                        className="px-2 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-black text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-md active:scale-95"
                        title="Registar Cartão"
                      >
                        <span>🟨</span>
                        <span className="hidden sm:inline">{lang === 'pt' ? 'Cartão' : 'Card'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStopBroadcast}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                      >
                        <VideoOff size={14} />
                        <span>{lang === 'pt' ? 'Encerrar' : 'End'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Spectator footer bar */
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1.5 font-bold">
                  {hasAccess ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">{lang === 'pt' ? 'Transmissão em Direto Conectada' : 'Live Stream Connected'}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-rose-400">🔒</span>
                      <span className="text-rose-400">{lang === 'pt' ? 'Feed de Vídeo Bloqueado · Requer Bilhete' : 'Video Feed Locked · Ticket Required'}</span>
                    </>
                  )}
                </span>
                <span className="text-[11px] text-gray-400 truncate">
                  Transmissão por: {match.liveStream?.broadcasterName || 'Organizador'}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Set-Piece Trigger Modal (Pênalti & Livre Direto) */}
      {setPieceModalType && (
        <SetPieceDecisionModal
          isOpen={!!setPieceModalType}
          match={match}
          type={setPieceModalType}
          players={match.lineup?.players || []}
          currentMinute={match.timer?.currentMinute || 0}
          lang={lang}
          onClose={() => setSetPieceModalType(null)}
          onSaveEvent={onSaveLiveEvent}
        />
      )}
    </AnimatePresence>
  );
}
