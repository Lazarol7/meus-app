import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, addDoc, getDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Match, Registration, MatchStats, Notification, Transfer, Club, MatchPhoto, CommunityNotification, ManualScorer, CommunityAd, LiveTicket, CommunityLeague, LicensePayment, MatchLiveEvent, Complaint } from './types';
import { LANGUAGES, Language } from './constants';
import ErrorBoundary from './components/ErrorBoundary';
import { Navbar, NavigationTab } from './components/Navbar';
import { MatchCard } from './components/MatchCard';
import { MatchDetail } from './components/MatchDetail';
import { PlayerStats } from './components/PlayerStats';
import { StatsChart } from './components/StatsChart';
import { Ranking } from './components/Ranking';
import { ProfileForm } from './components/ProfileForm';
import { PlayerManager } from './components/PlayerManager';
import { LanguageSelector } from './components/LanguageSelector';
import { MatchForm } from './components/MatchForm';
import { NotificationCenter } from './components/NotificationCenter';
import { CommunityNotifications } from './components/CommunityNotifications';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { AdminPanel } from './components/AdminPanel';
import { ClubManager } from './components/ClubManager';
import { BeSoccerHome } from './components/BeSoccerHome';
import { CommunityAdsManager } from './components/CommunityAdsManager';
import { CommunityLicensePanel } from './components/CommunityLicensePanel';
import { ComplaintsCenter } from './components/ComplaintsCenter';
import { activateUserPaymentStatus, deleteNotification, clearAllNotifications } from './services/paymentAccountService';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Trophy, Calendar, Users, DollarSign, LogIn, Star, Shield, Zap, Target, Plus, ArrowRight, RefreshCw, Bell, Eye, Megaphone, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isVisitor, setIsVisitor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [selectedClubIdForMatch, setSelectedClubIdForMatch] = useState<string | undefined>(undefined);
  const [matches, setMatches] = useState<Match[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<MatchStats[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [communityNotifications, setCommunityNotifications] = useState<CommunityNotification[]>([]);
  const [manualScorers, setManualScorers] = useState<ManualScorer[]>([]);
  const [communityAds, setCommunityAds] = useState<CommunityAd[]>([]);
  const [liveTickets, setLiveTickets] = useState<LiveTicket[]>([]);
  const [communityLeagues, setCommunityLeagues] = useState<CommunityLeague[]>([]);
  const [licensePayments, setLicensePayments] = useState<LicensePayment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [matchPhotos, setMatchPhotos] = useState<MatchPhoto[]>([]);
  const [lang, setLang] = useState<Language>('pt');
  const [selectedPlayer, setSelectedPlayer] = useState<UserProfile | null>(null);
  const [postPermissionNotice, setPostPermissionNotice] = useState<string | null>(null);

  const t = LANGUAGES[lang];
  const isAdmin = user?.role === 'admin' || user?.email === 'lazaroatalia80@gmail.com' || user?.email === 'lazaratala80@gmail.com';

  // Check if current user is allowed to post content (create matches, post announcements/news)
  // Only Master Admin, active monthly subscribers (600 MT), or explicitly authorized users can post
  const canUserPost = (u: UserProfile | null): boolean => {
    if (!u) return false;
    if (u.role === 'admin' || u.email === 'lazaroatalia80@gmail.com' || u.email === 'lazaratala80@gmail.com') {
      return true;
    }
    if (u.subscriptionStatus === 'active' && u.subscriptionExpiresAt && u.subscriptionExpiresAt > Date.now()) {
      return true;
    }
    if (u.canPostContent === true || u.canPostNews === true) {
      return true;
    }
    return false;
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userEmail = firebaseUser.email?.toLowerCase() || '';
        const isAdminEmail = userEmail === 'lazaroatalia80@gmail.com' || userEmail === 'lazaratala80@gmail.com';
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          if (isAdminEmail) {
            // Master Admin is ALWAYS 100% free and active
            const adminUpdates = { role: 'admin' as const, accountStatus: 'paid' as const, subscriptionStatus: 'active' as const, hasLiveAccess: true };
            if (userData.role !== 'admin' || userData.accountStatus !== 'paid') {
              await updateDoc(doc(db, 'users', firebaseUser.uid), adminUpdates);
              setUser({ ...userData, ...adminUpdates });
            } else {
              setUser(userData);
            }
          } else {
            // Regular user: check if their 1-month admin pass is still valid or expired
            const isMonthlyAdmin = Boolean(
              userData.subscriptionExpiresAt && 
              userData.subscriptionExpiresAt > Date.now() && 
              userData.subscriptionStatus === 'active'
            );

            if (isMonthlyAdmin && userData.role !== 'admin') {
              // Active 1-month pass
              const passUpdates = { role: 'admin' as const, subscriptionStatus: 'active' as const, accountStatus: 'paid' as const };
              await updateDoc(doc(db, 'users', firebaseUser.uid), passUpdates);
              setUser({ ...userData, ...passUpdates });
            } else if (!isMonthlyAdmin && userData.role === 'admin') {
              // Subscription expired, cancelled or suspended!
              // The user stays registered in the app as a normal user, but immediately loses admin privileges
              const expiredUpdates = { 
                role: 'user' as const, 
                accountStatus: 'free' as const,
                subscriptionStatus: 'expired' as const,
                canPostContent: false,
                canPostNews: false,
                hasLiveAccess: false,
              };
              await updateDoc(doc(db, 'users', firebaseUser.uid), expiredUpdates);
              setUser({ ...userData, ...expiredUpdates });
            } else {
              setUser(userData);
            }
          }
          setLang(userData.language);
        } else {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || (isAdminEmail ? 'Lázaro Atalia (Admin)' : 'Jogador'),
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            ratings: { defense: 5, passing: 5, finishing: 5 },
            language: 'pt',
            createdAt: Date.now(),
            role: isAdminEmail ? 'admin' : 'user',
            accountStatus: isAdminEmail ? 'paid' : 'free',
            subscriptionStatus: isAdminEmail ? 'active' : 'none',
            hasLiveAccess: isAdminEmail ? true : false,
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Public Data Listeners (Community Notifications, Top Scorers, Ads & Leagues - Available to anyone)
  useEffect(() => {
    const unsubCommunityNotifs = onSnapshot(collection(db, 'community_notifications'), (snapshot) => {
      setCommunityNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityNotification)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'community_notifications'));

    const unsubScorers = onSnapshot(collection(db, 'manual_scorers'), (snapshot) => {
      setManualScorers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManualScorer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'manual_scorers'));

    const unsubAds = onSnapshot(collection(db, 'community_ads'), (snapshot) => {
      setCommunityAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityAd)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'community_ads'));

    const unsubLeagues = onSnapshot(collection(db, 'community_leagues'), (snapshot) => {
      setCommunityLeagues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityLeague)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'community_leagues'));

    return () => {
      unsubCommunityNotifs();
      unsubScorers();
      unsubAds();
      unsubLeagues();
    };
  }, []);

  // Main App Data Listeners (active when authenticated or in visitor preview mode)
  useEffect(() => {
    if (!user && !isVisitor) return;

    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'matches'));

    const unsubRegs = onSnapshot(collection(db, 'registrations'), (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'registrations'));

    const unsubStats = onSnapshot(collection(db, 'stats'), (snapshot) => {
      setStats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchStats)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stats'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(userList);
      if (user) {
        const freshSelf = userList.find(u => u.uid === user.uid);
        if (freshSelf) {
          const isMaster = freshSelf.email?.toLowerCase() === 'lazaroatalia80@gmail.com' || freshSelf.email?.toLowerCase() === 'lazaratala80@gmail.com';
          if (!isMaster) {
            setUser(prev => {
              if (!prev) return null;
              // If subscription was cancelled or expired, ensure role immediately drops to user
              return {
                ...prev,
                ...freshSelf,
              };
            });
          }
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubTransfers = onSnapshot(
      query(collection(db, 'transfers'), orderBy('date', 'desc'), limit(10)),
      (snapshot) => {
        setTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transfer)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transfers')
    );

    const unsubClubs = onSnapshot(collection(db, 'clubs'), (snapshot) => {
      setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'clubs'));

    const unsubPhotos = onSnapshot(collection(db, 'match_photos'), (snapshot) => {
      setMatchPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchPhoto)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'match_photos'));

    const unsubTickets = onSnapshot(collection(db, 'live_tickets'), (snapshot) => {
      setLiveTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveTicket)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'live_tickets'));

    const unsubPayments = onSnapshot(collection(db, 'license_payments'), (snapshot) => {
      setLicensePayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LicensePayment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'license_payments'));

    const unsubComplaints = onSnapshot(collection(db, 'complaints'), (snapshot) => {
      setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'complaints'));

    // Private Notifications (invites) only for authenticated user
    let unsubNotifs = () => {};
    if (user) {
      unsubNotifs = onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', user.uid)),
        (snapshot) => {
          setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      );
    }

    return () => {
      unsubMatches();
      unsubRegs();
      unsubStats();
      unsubUsers();
      unsubNotifs();
      unsubTransfers();
      unsubClubs();
      unsubPhotos();
      unsubTickets();
      unsubPayments();
      unsubComplaints();
    };
  }, [user, isVisitor]);

  // Gated Match Creation: Only Master Admin, active monthly subscribers, or authorized members can create matches
  const handleOpenCreateMatch = (clubId?: string) => {
    if (!user || user.uid === 'visitor') {
      handleLogin();
      return;
    }
    if (!canUserPost(user)) {
      setPostPermissionNotice(
        'Apenas o Administrador Master (Lázaro Atalia), assinantes com mensalidade activa (600 MT) ou pessoas autorizadas pelo administrador podem criar e organizar partidas no Be-Lwezer.'
      );
      return;
    }
    setSelectedClubIdForMatch(clubId);
    setIsCreatingMatch(true);
  };

  // Handlers for Manual Scorers
  const handleSaveManualScorer = async (data: Omit<ManualScorer, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'manual_scorers'), {
        ...data,
        createdAt: Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'manual_scorers');
    }
  };

  const handleDeleteManualScorer = async (scorerId: string) => {
    try {
      await deleteDoc(doc(db, 'manual_scorers', scorerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'manual_scorers');
    }
  };

  // Handlers for Community Notifications
  const handleSaveCommunityNotification = async (data: Omit<CommunityNotification, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'community_notifications'), {
        ...data,
        createdAt: Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'community_notifications');
    }
  };

  const handleDeleteCommunityNotification = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, 'community_notifications', notifId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'community_notifications');
    }
  };

  const handleLikeCommunityNotification = async (notifId: string) => {
    const notif = communityNotifications.find(n => n.id === notifId);
    if (!notif) return;
    const userId = user?.uid || 'visitor_like';
    const currentLikes = notif.likes || 0;
    const likedBy = notif.likedBy || [];
    const isLiked = likedBy.includes(userId);
    const newLikedBy = isLiked ? likedBy.filter(id => id !== userId) : [...likedBy, userId];
    const newLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    try {
      await updateDoc(doc(db, 'community_notifications', notifId), {
        likes: newLikes,
        likedBy: newLikedBy,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'community_notifications');
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Helper to deep clean objects and remove any undefined fields before writing to Firestore
  const cleanFirestoreData = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(cleanFirestoreData).filter(item => item !== undefined);
    }
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = cleanFirestoreData(value);
      }
    }
    return clean;
  };

  const handleCreateMatch = async (matchData: Omit<Match, 'id' | 'status' | 'organizerId'>) => {
    if (!user) return;
    try {
      const cleanMatch: Record<string, any> = {
        date: matchData.date,
        location: matchData.location,
        price: matchData.price || 0,
        maxPlayers: matchData.maxPlayers || 14,
        status: 'open',
        organizerId: user.uid,
        teamAName: matchData.teamAName || 'Equipa A',
        teamBName: matchData.teamBName || 'Equipa B',
      };
      if (matchData.description) cleanMatch.description = matchData.description;
      if (matchData.teamAClubId) cleanMatch.teamAClubId = matchData.teamAClubId;
      if (matchData.teamBClubId) cleanMatch.teamBClubId = matchData.teamBClubId;
      if (matchData.teamALogoURL) cleanMatch.teamALogoURL = matchData.teamALogoURL;
      if (matchData.teamBLogoURL) cleanMatch.teamBLogoURL = matchData.teamBLogoURL;
      if (matchData.league) cleanMatch.league = matchData.league;
      if (matchData.lineup) cleanMatch.lineup = matchData.lineup;
      if (matchData.timer) cleanMatch.timer = matchData.timer;

      // Save player rosters directly as strings of player names without requiring a user account
      if (matchData.playerNames && Array.isArray(matchData.playerNames)) {
        cleanMatch.playerNames = matchData.playerNames;
      }
      if (matchData.squadNames && Array.isArray(matchData.squadNames)) {
        cleanMatch.squadNames = matchData.squadNames;
      }
      if (matchData.teamAPlayerNames && Array.isArray(matchData.teamAPlayerNames)) {
        cleanMatch.teamAPlayerNames = matchData.teamAPlayerNames;
      }
      if (matchData.teamBPlayerNames && Array.isArray(matchData.teamBPlayerNames)) {
        cleanMatch.teamBPlayerNames = matchData.teamBPlayerNames;
      }

      const sanitizedMatch = cleanFirestoreData(cleanMatch);
      const matchRef = await addDoc(collection(db, 'matches'), sanitizedMatch);

      // Create notifications for other registered app users (non-blocking)
      try {
        const otherUsers = allUsers.filter(u => u.uid !== user.uid);
        for (const u of otherUsers.slice(0, 25)) {
          await addDoc(collection(db, 'notifications'), {
            userId: u.uid,
            matchId: matchRef.id,
            type: 'invite',
            status: 'pending',
            createdAt: Date.now(),
          });
        }
      } catch (notifErr) {
        console.warn('Could not dispatch notifications:', notifErr);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    }
  };

  const handleRegister = async (matchId: string) => {
    if (!user) return;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const confirmedCount = registrations.filter(r => r.matchId === matchId && r.status === 'confirmed').length;
    const status = confirmedCount < match.maxPlayers ? 'confirmed' : 'waiting';

    const newReg: Omit<Registration, 'id'> = {
      matchId,
      userId: user.uid,
      status,
      paid: false,
      registeredAt: Date.now(),
    };

    try {
      await addDoc(collection(db, 'registrations'), newReg);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'registrations');
    }
  };

  const handleCancelRegistration = async (regId: string) => {
    const regToCancel = registrations.find(r => r.id === regId);
    if (!regToCancel) return;

    try {
      // 1. Delete the registration
      await deleteDoc(doc(db, 'registrations', regId));

      // 2. If it was confirmed, promote the first person in the waiting list
      if (regToCancel.status === 'confirmed') {
        const waitingList = registrations
          .filter(r => r.matchId === regToCancel.matchId && r.status === 'waiting')
          .sort((a, b) => a.registeredAt - b.registeredAt);

        if (waitingList.length > 0) {
          const nextReg = waitingList[0];
          await updateDoc(doc(db, 'registrations', nextReg.id), { status: 'confirmed' });
          
          // Notify the promoted player
          await addDoc(collection(db, 'notifications'), {
            userId: nextReg.userId,
            matchId: regToCancel.matchId,
            type: 'waiting_list_promotion',
            status: 'pending',
            createdAt: Date.now(),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'registrations');
    }
  };

  const handleTogglePaid = async (regId: string, currentStatus: boolean) => {
    const reg = registrations.find(r => r.id === regId);
    const match = matches.find(m => m.id === reg?.matchId);
    if (!user || (!isAdmin && match?.organizerId !== user.uid)) return;
    try {
      await updateDoc(doc(db, 'registrations', regId), { paid: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'registrations');
    }
  };

  const handleFinishMatch = async (matchId: string, statsToSave: Omit<MatchStats, 'id'>[], scoreA: number, scoreB: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!user || (!isAdmin && match?.organizerId !== user.uid)) return;
    try {
      // 1. Update match status and scores
      await updateDoc(doc(db, 'matches', matchId), {
        status: 'finished',
        scoreA,
        scoreB
      });

      // 2. Save individual player stats
      for (const stat of statsToSave) {
        await addDoc(collection(db, 'stats'), stat);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches');
    }
  };

  const handleCancelMatch = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!user || (!isAdmin && match?.organizerId !== user.uid)) return;
    try {
      // 1. Update match status
      await updateDoc(doc(db, 'matches', matchId), { status: 'cancelled' });

      // 2. Notify all registered players
      const matchRegs = registrations.filter(r => r.matchId === matchId);
      for (const reg of matchRegs) {
        await addDoc(collection(db, 'notifications'), {
          userId: reg.userId,
          matchId,
          type: 'match_cancelled',
          status: 'pending',
          createdAt: Date.now(),
        });
      }
      setSelectedMatchId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!user || (!isAdmin && match?.organizerId !== user.uid)) return;
    try {
      // 1. Delete the match document
      await deleteDoc(doc(db, 'matches', matchId));

      // 2. Clean up associated registrations
      const matchRegs = registrations.filter(r => r.matchId === matchId);
      for (const reg of matchRegs) {
        await deleteDoc(doc(db, 'registrations', reg.id)).catch(() => {});
      }

      // 3. Clean up associated stats
      const matchStats = stats.filter(s => s.matchId === matchId);
      for (const st of matchStats) {
        await deleteDoc(doc(db, 'stats', st.id)).catch(() => {});
      }

      // 4. Clean up associated photos
      const matchPhotosList = matchPhotos.filter(p => p.matchId === matchId);
      for (const ph of matchPhotosList) {
        await deleteDoc(doc(db, 'match_photos', ph.id)).catch(() => {});
      }

      if (selectedMatchId === matchId) {
        setSelectedMatchId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'matches');
    }
  };

  const handleUpdateMatch = async (matchId: string, updates: Partial<Match>) => {
    const match = matches.find(m => m.id === matchId);
    if (!user || (!isAdmin && match?.organizerId !== user.uid)) return;
    try {
      await updateDoc(doc(db, 'matches', matchId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches');
    }
  };

  const handleAcceptInvite = async (notifId: string, matchId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'notifications', notifId), { status: 'accepted' });
      await handleRegister(matchId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const handleDeclineInvite = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { status: 'declined' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    try {
      await deleteNotification(notifId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  const handleClearAllNotifications = async () => {
    if (!user) return;
    try {
      await clearAllNotifications(user.uid);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  const handleSaveProfile = async (ratings: UserProfile['ratings'], photoURL?: string, description?: string, clubName?: string, clubLogoURL?: string, position?: string) => {
    if (!user) return;
    try {
      const oldClub = user.clubName;
      const updates = { ratings, language: lang, photoURL, description, clubName, clubLogoURL, position };
      await updateDoc(doc(db, 'users', user.uid), updates);
      
      // Handle transfer notification
      if (clubName && clubName !== oldClub) {
        await addDoc(collection(db, 'transfers'), {
          playerId: user.uid,
          playerName: user.displayName,
          playerPhoto: photoURL || user.photoURL,
          fromClub: oldClub || '',
          toClub: clubName,
          date: Date.now(),
        });
      }

      setUser({ ...user, ...updates });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleUpdatePlayerRating = async (userId: string, ratings: UserProfile['ratings']) => {
    try {
      await updateDoc(doc(db, 'users', userId), { ratings });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: 'user' | 'admin') => {
    if (!user || user.email !== 'lazaroatalia80@gmail.com') return;
    try {
      await updateDoc(doc(db, 'users', userId), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleSaveClub = async (clubData: Omit<Club, 'id'>) => {
    try {
      // Clean and ensure no undefined values are sent to Firestore
      const cleanData: Record<string, any> = {
        name: clubData.name?.trim() || 'Clube do Bairro',
        president: clubData.president?.trim() || '',
        coach: clubData.coach?.trim() || '',
        location: clubData.location?.trim() || '',
        league: clubData.league?.trim() || 'Liga do Bairro',
        foundedAt: clubData.foundedAt || Date.now(),
        description: clubData.description?.trim() || '',
        logoURL: clubData.logoURL?.trim() || '',
        players: clubData.players || [],
        playerRoster: clubData.playerRoster || [],
        playerIds: clubData.playerIds || [],
        createdBy: clubData.createdBy || user?.uid || '',
      };

      const docRef = await addDoc(collection(db, 'clubs'), cleanData);
      if (user && !user.clubId) {
        await updateDoc(doc(db, 'users', user.uid), {
          clubId: docRef.id,
          clubName: cleanData.name,
          clubLogoURL: cleanData.logoURL || null,
        });
        setUser({ ...user, clubId: docRef.id, clubName: cleanData.name, clubLogoURL: cleanData.logoURL });
      }
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clubs');
    }
  };

  const handleUpdateClub = async (clubId: string, clubData: Partial<Club>) => {
    try {
      const cleanData: Record<string, any> = {};
      for (const [key, val] of Object.entries(clubData)) {
        if (val !== undefined) {
          cleanData[key] = val;
        }
      }
      await updateDoc(doc(db, 'clubs', clubId), cleanData);
      if (user?.clubId === clubId && cleanData.name) {
        await updateDoc(doc(db, 'users', user.uid), {
          clubName: cleanData.name,
          clubLogoURL: cleanData.logoURL || null,
        });
        setUser({ ...user, clubName: cleanData.name, clubLogoURL: cleanData.logoURL });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clubs');
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    try {
      await deleteDoc(doc(db, 'clubs', clubId));
      if (user?.clubId === clubId) {
        await updateDoc(doc(db, 'users', user.uid), {
          clubId: null,
          clubName: null,
          clubLogoURL: null,
        });
        setUser({ ...user, clubId: undefined, clubName: undefined, clubLogoURL: undefined });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'clubs');
    }
  };

  const handleLeaveClub = async (club: Club) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        clubId: null,
        clubName: null,
        clubLogoURL: null,
      });

      if (club.playerIds && club.playerIds.includes(user.uid)) {
        await updateDoc(doc(db, 'clubs', club.id), {
          playerIds: club.playerIds.filter(id => id !== user.uid)
        });
      }

      setUser({ ...user, clubId: undefined, clubName: undefined, clubLogoURL: undefined });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleJoinClub = async (club: Club) => {
    if (!user) return;
    try {
      const oldClubName = user.clubName;
      await updateDoc(doc(db, 'users', user.uid), {
        clubId: club.id,
        clubName: club.name,
        clubLogoURL: club.logoURL || null
      });

      // Update club playerIds list
      const existingPlayerIds = club.playerIds || [];
      if (!existingPlayerIds.includes(user.uid)) {
        await updateDoc(doc(db, 'clubs', club.id), {
          playerIds: [...existingPlayerIds, user.uid]
        });
      }

      // Create a transfer record
      if (club.name !== oldClubName) {
        await addDoc(collection(db, 'transfers'), {
          playerId: user.uid,
          playerName: user.displayName,
          playerPhoto: user.photoURL || null,
          fromClub: oldClubName || null,
          toClub: club.name,
          date: Date.now()
        });
      }

      setUser({ ...user, clubId: club.id, clubName: club.name, clubLogoURL: club.logoURL });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleAddMatchPhoto = async (photoData: Omit<MatchPhoto, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'match_photos'), {
        ...photoData,
        createdAt: Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'match_photos');
    }
  };

  const handleDeleteMatchPhoto = async (photoId: string) => {
    try {
      await deleteDoc(doc(db, 'match_photos', photoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'match_photos');
    }
  };

  // =========================================================================
  // COMMUNITY ADS & SPONSORS HANDLERS
  // =========================================================================
  const handleSaveCommunityAd = async (adData: Omit<CommunityAd, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      await addDoc(collection(db, 'community_ads'), {
        ...adData,
        createdBy: user?.uid || 'visitor',
        createdAt: Date.now(),
        active: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'community_ads');
    }
  };

  const handleDeleteCommunityAd = async (adId: string) => {
    try {
      await deleteDoc(doc(db, 'community_ads', adId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'community_ads');
    }
  };

  // =========================================================================
  // COMMUNITY LEAGUES & LICENSING RENEWAL HANDLERS
  // =========================================================================
  const handleSaveLeague = async (leagueData: Partial<CommunityLeague>) => {
    try {
      await addDoc(collection(db, 'community_leagues'), {
        ...leagueData,
        createdAt: Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'community_leagues');
    }
  };

  const handleRenewLicense = async (paymentData: Omit<LicensePayment, 'id' | 'paidAt'>, daysToAdd: number = 30) => {
    try {
      const targetUserId = user?.uid || paymentData.processedBy || 'admin';
      const result = await activateUserPaymentStatus({
        userId: targetUserId,
        userName: user?.displayName,
        userEmail: user?.email,
        type: 'monthly_subscription',
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        leagueId: paymentData.leagueId,
        leagueName: paymentData.leagueName,
        phoneNumber: paymentData.phoneNumber,
        reference: paymentData.reference,
        validDays: daysToAdd,
      });

      if (user && targetUserId === user.uid) {
        setUser({
          ...user,
          ...result.updatedFields,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'license_payments');
    }
  };

  const handleToggleLeagueStatus = async (leagueId: string, newStatus: 'active' | 'expired') => {
    try {
      await updateDoc(doc(db, 'community_leagues', leagueId), {
        status: newStatus,
        statusReason: newStatus === 'expired' ? 'Cancelado pelo Administrador (Fim do Mês)' : 'Ativado pelo Administrador',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'community_leagues');
    }
  };

  // Administrator confirms monthly payment and unlocks the app for the league
  const handleConfirmMonthlyPayment = async (payment: LicensePayment) => {
    if (!isAdmin) return;
    try {
      const validUntil = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      
      // 1. Update payment document
      await updateDoc(doc(db, 'license_payments', payment.id), {
        status: 'completed',
        confirmedByAdmin: true,
        confirmedAt: Date.now(),
        validUntil,
        processedBy: user?.displayName || 'Lázaro Atalia (Admin)',
      });

      // 2. Activate matching league or create it
      let targetLeague = communityLeagues.find(l => 
        (payment.leagueId && l.id === payment.leagueId) || 
        (l.name.toLowerCase() === payment.leagueName.toLowerCase())
      );

      if (targetLeague) {
        await updateDoc(doc(db, 'community_leagues', targetLeague.id), {
          status: 'active',
          expiresAt: validUntil,
          confirmedByAdmin: true,
          confirmedAt: Date.now(),
          statusReason: 'Ativado e Confirmado pelo Administrador',
        });
      } else {
        const newLeagueRef = await addDoc(collection(db, 'community_leagues'), {
          name: payment.leagueName,
          responsibleAdminEmail: payment.userEmail || (user?.email || ''),
          responsibleAdminName: payment.userName || 'Organizador',
          responsibleAdminPhone: payment.phoneNumber || '',
          adminUserId: payment.userId || '',
          monthlyFee: 600,
          status: 'active',
          expiresAt: validUntil,
          createdAt: Date.now(),
          confirmedByAdmin: true,
          confirmedAt: Date.now(),
        });
      }

      // 3. Update requester user account to paid & active
      if (payment.userId) {
        await updateDoc(doc(db, 'users', payment.userId), {
          accountStatus: 'paid',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: validUntil,
          lastPaymentAt: Date.now(),
          lastPaymentType: 'monthly_subscription',
        }).catch(() => {});

        // 4. Send notification to user
        await addDoc(collection(db, 'notifications'), {
          userId: payment.userId,
          type: 'monthly_payment_confirmed',
          title: 'Mensalidade Confirmada! ⚽',
          message: `A sua mensalidade de 600 MT foi confirmada pelo Administrador Lázaro Atalia! O app está libertado para gerir a liga "${payment.leagueName}" e publicar notícias até ${new Date(validUntil).toLocaleDateString('pt-MZ')}.`,
          status: 'pending',
          createdAt: Date.now(),
          amount: payment.amount || 600,
        }).catch(() => {});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'license_payments');
    }
  };

  // Administrator cancels/suspends access immediately or at end of month until renewal
  const handleCancelOrSuspendLeague = async (leagueId: string, reason?: string) => {
    if (!isAdmin) return;
    try {
      const league = communityLeagues.find(l => l.id === leagueId);
      const statusReason = reason || 'Mensalidade cancelada pelo Administrador Master.';

      await updateDoc(doc(db, 'community_leagues', leagueId), {
        status: 'expired',
        expiresAt: Date.now(),
        confirmedByAdmin: false,
        statusReason,
      });

      // Find user responsible for this league
      const targetUser = allUsers.find(u => 
        (league?.adminUserId && u.uid === league.adminUserId) ||
        (league?.responsibleAdminEmail && u.email.toLowerCase() === league.responsibleAdminEmail.toLowerCase())
      );

      if (targetUser && targetUser.email !== 'lazaroatalia80@gmail.com' && targetUser.email !== 'lazaratala80@gmail.com') {
        const resetUpdates = {
          role: 'user' as const,
          accountStatus: 'free' as const,
          subscriptionStatus: 'expired' as const,
          subscriptionExpiresAt: 0,
          canPostContent: false,
          canPostNews: false,
          hasLiveAccess: false,
        };

        await updateDoc(doc(db, 'users', targetUser.uid), resetUpdates).catch(() => {});

        // Optimistic UI updates
        setAllUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, ...resetUpdates } : u));
        if (user && user.uid === targetUser.uid) {
          setUser({ ...user, ...resetUpdates });
        }

        await addDoc(collection(db, 'notifications'), {
          userId: targetUser.uid,
          type: 'subscription_suspended',
          title: 'Mensalidade Cancelada pelo Administrador',
          message: `A mensalidade da sua liga "${league?.name || 'Comunitária'}" foi cancelada pelo Administrador Master. O seu cadastro continua ativo como utilizador comum, mas o acesso para postar notícias e gerir partidas foi imediatamente encerrado.`,
          status: 'pending',
          createdAt: Date.now(),
        }).catch(() => {});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'community_leagues');
    }
  };

  // User submits a monthly payment request for admin confirmation
  const handleSubmitMonthlyPaymentRequest = async (paymentData: {
    leagueName: string;
    phoneNumber: string;
    paymentMethod: 'mpesa' | 'emola';
    reference: string;
    notes?: string;
    leagueId?: string;
  }) => {
    if (!user) return;
    try {
      const validUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
      await addDoc(collection(db, 'license_payments'), {
        ...paymentData,
        amount: 600,
        status: 'pending',
        paidAt: Date.now(),
        validUntil,
        userId: user.uid,
        userName: user.displayName || 'Organizador',
        userEmail: user.email || '',
        processedBy: 'Pendente de Confirmação',
      });

      // If league exists, flag status as pending
      if (paymentData.leagueId) {
        await updateDoc(doc(db, 'community_leagues', paymentData.leagueId), {
          status: 'pending',
          statusReason: 'Comprovativo de mensalidade enviado, aguardando confirmação do Administrador',
        }).catch(() => {});
      } else {
        // Register league as pending
        await addDoc(collection(db, 'community_leagues'), {
          name: paymentData.leagueName,
          responsibleAdminEmail: user.email,
          responsibleAdminName: user.displayName,
          responsibleAdminPhone: paymentData.phoneNumber,
          adminUserId: user.uid,
          monthlyFee: 600,
          status: 'pending',
          expiresAt: Date.now(),
          createdAt: Date.now(),
          statusReason: 'Aguardando confirmação da mensalidade pelo Administrador',
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'license_payments');
    }
  };

  // Admin rejects an invalid payment submission
  const handleRejectMonthlyPayment = async (paymentId: string, reason?: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'license_payments', paymentId), {
        status: 'rejected',
        rejectionReason: reason || 'Comprovativo não identificado ou valor incorreto.',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'license_payments');
    }
  };

  // Liberate a user as Admin for 1 month (30 days) by their email
  const handleLiberateUserByEmail = async (targetEmailRaw: string, days: number = 30) => {
    if (!isAdmin) return;
    const targetEmail = targetEmailRaw.trim().toLowerCase();
    if (!targetEmail) return;

    try {
      const validUntil = Date.now() + days * 24 * 60 * 60 * 1000;
      const targetUser = allUsers.find(u => u.email.toLowerCase() === targetEmail);

      if (targetUser) {
        await updateDoc(doc(db, 'users', targetUser.uid), {
          role: 'admin',
          accountStatus: 'paid',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: validUntil,
          lastPaymentAt: Date.now(),
          lastPaymentType: 'monthly_subscription',
          hasLiveAccess: true,
        });

        // Find or create associated league in community_leagues
        const existingLeague = communityLeagues.find(l => 
          (l.adminUserId && l.adminUserId === targetUser.uid) ||
          (l.responsibleAdminEmail && l.responsibleAdminEmail.toLowerCase() === targetEmail)
        );

        if (existingLeague) {
          await updateDoc(doc(db, 'community_leagues', existingLeague.id), {
            status: 'active',
            expiresAt: validUntil,
            confirmedByAdmin: true,
            statusReason: 'Mensalidade aprovada e liberada pelo Administrador Master por e-mail',
          });
        } else {
          await addDoc(collection(db, 'community_leagues'), {
            name: `Liga de ${targetUser.displayName}`,
            responsibleAdminEmail: targetEmail,
            responsibleAdminName: targetUser.displayName,
            adminUserId: targetUser.uid,
            monthlyFee: 600,
            status: 'active',
            expiresAt: validUntil,
            createdAt: Date.now(),
            confirmedByAdmin: true,
            statusReason: 'Liberado pelo Administrador Master por e-mail',
          });
        }

        // Notify user about their 1-month admin pass
        await addDoc(collection(db, 'notifications'), {
          userId: targetUser.uid,
          type: 'monthly_payment_confirmed',
          title: 'Acesso de Administrador Liberado (1 Mês)! ⚽',
          message: `O Administrador Lázaro Atalia libertou o acesso do aplicativo para o seu e-mail! Você é agora Administrador durante 1 mês (até ${new Date(validUntil).toLocaleDateString('pt-MZ')}). Agora você pode criar clubes, organizar partidas e postar notícias sobre a sua liga.`,
          status: 'pending',
          createdAt: Date.now(),
          amount: 600,
        });

        // Register completed license payment record
        await addDoc(collection(db, 'license_payments'), {
          leagueName: existingLeague ? existingLeague.name : `Liga de ${targetUser.displayName}`,
          amount: 600,
          paymentMethod: 'mpesa',
          phoneNumber: targetUser.phoneNumber || 'Ativação Manual por Email',
          reference: `ADM-LIB-${Date.now().toString().slice(-6)}`,
          status: 'completed',
          paidAt: Date.now(),
          validUntil,
          userId: targetUser.uid,
          userName: targetUser.displayName,
          userEmail: targetEmail,
          processedBy: user?.email || 'Administrador Master',
          notes: 'Liberado diretamente por e-mail pelo Administrador Master',
        });
      } else {
        // User not signed up yet: register pre-authorized league so they become admin on first login
        await addDoc(collection(db, 'community_leagues'), {
          name: `Liga Comunitária (${targetEmail})`,
          responsibleAdminEmail: targetEmail,
          monthlyFee: 600,
          status: 'active',
          expiresAt: validUntil,
          createdAt: Date.now(),
          confirmedByAdmin: true,
          statusReason: 'Pré-liberado pelo Administrador Master por e-mail',
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  // Suspend or cancel admin access for a user by email (at end of month or immediately)
  const handleSuspendUserAdminByEmail = async (targetEmailRaw: string) => {
    if (!isAdmin) return;
    const targetEmail = targetEmailRaw.trim().toLowerCase();
    if (!targetEmail) return;

    if (targetEmail === 'lazaroatalia80@gmail.com' || targetEmail === 'lazaratala80@gmail.com') {
      return;
    }

    try {
      const targetUser = allUsers.find(u => u.email.toLowerCase() === targetEmail);
      if (targetUser) {
        const resetUpdates = {
          role: 'user' as const,
          accountStatus: 'free' as const,
          subscriptionStatus: 'expired' as const,
          subscriptionExpiresAt: 0, // Ends immediately
          canPostContent: false,
          canPostNews: false,
          hasLiveAccess: false,
        };

        await updateDoc(doc(db, 'users', targetUser.uid), resetUpdates);

        // Optimistic UI updates
        setAllUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, ...resetUpdates } : u));
        if (user && user.uid === targetUser.uid) {
          setUser({ ...user, ...resetUpdates });
        }

        const existingLeague = communityLeagues.find(l => 
          (l.adminUserId && l.adminUserId === targetUser.uid) ||
          (l.responsibleAdminEmail && l.responsibleAdminEmail.toLowerCase() === targetEmail)
        );

        if (existingLeague) {
          await updateDoc(doc(db, 'community_leagues', existingLeague.id), {
            status: 'expired',
            expiresAt: Date.now(),
            confirmedByAdmin: false,
            statusReason: 'Mensalidade cancelada pelo Administrador Master.',
          });
          setCommunityLeagues(prev => prev.map(l => l.id === existingLeague.id ? {
            ...l,
            status: 'expired',
            expiresAt: Date.now(),
            confirmedByAdmin: false,
            statusReason: 'Mensalidade cancelada pelo Administrador Master.',
          } : l));
        }

        await addDoc(collection(db, 'notifications'), {
          userId: targetUser.uid,
          type: 'subscription_suspended',
          title: 'Mensalidade Cancelada de Imediato',
          message: 'A sua mensalidade de Administrador foi cancelada de imediato pelo Administrador Master. O seu registo no Be-Lwezer continua ativo como utilizador comum, mas já não administra o app nem cria novas partidas/notícias.',
          status: 'pending',
          createdAt: Date.now(),
        }).catch(() => {});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  // Toggle user's posting permission (Admin can allow non-subscribers to create matches and post ads)
  const handleToggleUserPostPermission = async (userId: string, currentVal: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        canPostContent: currentVal,
        canPostNews: currentVal,
      });

      // Notify the user about their posting permission status
      const targetUser = allUsers.find(u => u.uid === userId);
      if (targetUser) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetUser.uid,
          type: currentVal ? 'permission_granted' : 'permission_revoked',
          title: currentVal ? 'Permissão de Publicação Concedida! ✍️' : 'Permissão de Publicação Atualizada',
          message: currentVal
            ? 'O Administrador Lázaro Atalia concedeu-lhe permissão para criar partidas, publicar notícias e anúncios no Be-Lwezer!'
            : 'A sua permissão para criar partidas e anúncios no Be-Lwezer foi revogada pelo administrador.',
          status: 'pending',
          createdAt: Date.now(),
        }).catch(() => {});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  // =========================================================================
  // COMPLAINTS & GRIEVANCE CENTER HANDLERS (RECLAMAÇÕES E OUVIDORIA)
  // =========================================================================
  const handleSubmitComplaint = async (data: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'userId' | 'userName' | 'userEmail'>) => {
    if (!user) return;
    try {
      const complaintData = {
        ...data,
        userId: user.uid,
        userName: user.displayName || 'Utilizador',
        userEmail: user.email || '',
        status: 'pending',
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'complaints'), complaintData);

      // Notify Master Admin if user is not the admin
      if (!isAdmin) {
        const adminUsers = allUsers.filter(u => 
          u.email === 'lazaroatalia80@gmail.com' || u.email === 'lazaratala80@gmail.com' || u.role === 'admin'
        );
        for (const adm of adminUsers) {
          await addDoc(collection(db, 'notifications'), {
            userId: adm.uid,
            type: 'new_complaint',
            title: `Nova Reclamação: ${data.title}`,
            message: `${user.displayName} enviou uma reclamação na categoria "${data.category}". Verifique a central de reclamações para responder.`,
            status: 'pending',
            createdAt: Date.now(),
          }).catch(() => {});
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'complaints');
    }
  };

  const handleRespondComplaint = async (complaintId: string, responseText: string) => {
    if (!isAdmin) return;
    try {
      const targetComplaint = complaints.find(c => c.id === complaintId);
      const responderName = user?.displayName || 'Lázaro Atalia (Administrador Master)';

      await updateDoc(doc(db, 'complaints', complaintId), {
        adminResponse: responseText.trim(),
        respondedAt: Date.now(),
        respondedBy: responderName,
        status: 'answered',
      });

      // Send in-app notification to the complaint author
      if (targetComplaint?.userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetComplaint.userId,
          type: 'complaint_answered',
          title: 'O Administrador respondeu à sua reclamação! 💬',
          message: `O Administrador Lázaro Atalia respondeu ao seu ticket "${targetComplaint.title}". Veja a resposta na aba Reclamações.`,
          status: 'pending',
          createdAt: Date.now(),
        }).catch(() => {});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'complaints');
    }
  };

  const handleResolveComplaint = async (complaintId: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'complaints', complaintId), {
        status: 'resolved',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'complaints');
    }
  };

  // =========================================================================
  // MATCH LIVE VIDEO STREAM & TICKETING HANDLERS
  // =========================================================================
  const handleStartLiveStream = async (matchId: string, price: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        liveStream: {
          isLive: true,
          broadcasterId: user.uid,
          broadcasterName: user.displayName || 'Transmissor',
          price: Number(price) || 0,
          viewerCount: 1,
          viewers: [user.uid],
          startedAt: Date.now(),
          streamStatus: 'live',
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches');
    }
  };

  const handleStopLiveStream = async (matchId: string) => {
    try {
      const match = matches.find(m => m.id === matchId);
      await updateDoc(doc(db, 'matches', matchId), {
        liveStream: {
          ...match?.liveStream,
          isLive: false,
          streamStatus: 'ended',
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches');
    }
  };

  const handleBuyLiveTicket = async (matchId: string, amount: number, method: 'mpesa' | 'emola' | 'card') => {
    if (!user) return;
    try {
      const result = await activateUserPaymentStatus({
        userId: user.uid,
        userName: user.displayName || 'Espectador',
        userEmail: user.email,
        type: 'live_ticket',
        amount: Number(amount) || 0,
        paymentMethod: method,
        matchId,
      });

      setUser({
        ...user,
        ...result.updatedFields,
        purchasedLiveMatchIds: Array.from(new Set([...(user.purchasedLiveMatchIds || []), matchId])),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'live_tickets');
    }
  };

  const handleSaveLiveEvent = async (matchId: string, event: Omit<MatchLiveEvent, 'id' | 'createdAt'>) => {
    try {
      const match = matches.find(m => m.id === matchId);
      const newEvent: MatchLiveEvent = {
        ...event,
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
      };
      const existingEvents = match?.liveEvents || [];
      await updateDoc(doc(db, 'matches', matchId), {
        liveEvents: [...existingEvents, newEvent]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'matches');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-600">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
          <h1 className="text-white font-bold text-xl tracking-widest uppercase">Be-Lwezer</h1>
        </div>
      </div>
    );
  }

  if (!user && !isVisitor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-600 p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full"
        >
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Trophy className="w-12 h-12 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">Be-Lwezer</h1>
          <p className="text-emerald-100 mb-8 text-base">Organiza as tuas peladas, acompanha as tuas estatísticas e torna-te a lenda do bairro.</p>
          
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-emerald-700 py-4 rounded-2xl font-bold text-base hover:bg-emerald-50 transition-all shadow-xl cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              {t.loginWithGoogle}
            </button>

            <button
              onClick={() => {
                setIsVisitor(true);
                setActiveTab('home');
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700/80 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold text-sm border border-emerald-400/30 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-emerald-200" />
              <span>{lang === 'pt' ? 'Ver Notificações e Jogos (Visitante)' : 'View Notices & Matches (Guest)'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const selectedMatch = matches.find(m => m.id === selectedMatchId);
  const selectedMatchRegs = registrations
    .filter(r => r.matchId === selectedMatchId)
    .map(r => ({ ...r, user: allUsers.find(u => u.uid === r.userId) }));
  const selectedMatchStats = stats.filter(s => s.matchId === selectedMatchId);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 pb-24">
        {!user && (
          <div className="bg-emerald-900 text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-md sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">
                {lang === 'pt' ? 'Modo Visitante · Acompanhando Notificações e Jogos' : 'Guest Mode · Public Notices & Matches'}
              </span>
            </div>
            <button
              onClick={handleLogin}
              className="px-3 py-1 bg-white text-emerald-950 rounded-xl font-black uppercase text-[10px] hover:bg-emerald-50 transition-all cursor-pointer shadow-sm"
            >
              {t.loginWithGoogle}
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {selectedMatchId && selectedMatch ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <MatchDetail
                match={selectedMatch}
                registrations={selectedMatchRegs}
                stats={selectedMatchStats}
                photos={matchPhotos.filter(p => p.matchId === selectedMatchId)}
                currentUser={user || {
                  uid: 'visitor',
                  displayName: 'Visitante',
                  email: '',
                  ratings: { defense: 3, passing: 3, finishing: 3 },
                  language: lang,
                  createdAt: Date.now(),
                }}
                lang={lang}
                communityAds={communityAds}
                liveTickets={liveTickets}
                communityLeagues={communityLeagues}
                allMatches={matches}
                onSelectMatch={(id) => setSelectedMatchId(id)}
                onBack={() => setSelectedMatchId(null)}
                onRegister={() => handleRegister(selectedMatchId)}
                onCancelRegistration={handleCancelRegistration}
                onTogglePaid={handleTogglePaid}
                onFinishMatch={(stats, sA, sB) => handleFinishMatch(selectedMatchId, stats, sA, sB)}
                onCancelMatch={() => handleCancelMatch(selectedMatchId)}
                onDeleteMatch={handleDeleteMatch}
                onUpdateMatch={handleUpdateMatch}
                onPlayerClick={setSelectedPlayer}
                onAddPhoto={handleAddMatchPhoto}
                onDeletePhoto={handleDeleteMatchPhoto}
                onStartLiveStream={(price) => handleStartLiveStream(selectedMatchId, price)}
                onStopLiveStream={() => handleStopLiveStream(selectedMatchId)}
                onBuyLiveTicket={(amount, method) => handleBuyLiveTicket(selectedMatchId, amount, method)}
                onSaveLiveEvent={(event) => handleSaveLiveEvent(selectedMatchId, event)}
                onOpenLicenseRenewal={() => {
                  setSelectedMatchId(null);
                  setActiveTab('licenses');
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "mx-auto p-4 md:p-6 pb-28 transition-all",
                activeTab === 'home' || activeTab === 'clubs' ? "max-w-5xl" : "max-w-2xl"
              )}
            >
              {/* Home Tab - BeSoccer Style */}
              {activeTab === 'home' && (
                <BeSoccerHome
                  user={user || {
                    uid: 'visitor',
                    displayName: lang === 'pt' ? 'Visitante' : 'Visitor',
                    email: '',
                    ratings: { defense: 3, passing: 3, finishing: 3 },
                    language: lang,
                    createdAt: Date.now(),
                  }}
                  matches={matches}
                  registrations={registrations}
                  stats={stats}
                  allUsers={allUsers}
                  transfers={transfers}
                  clubs={clubs}
                  manualScorers={manualScorers}
                  communityAds={communityAds}
                  communityLeagues={communityLeagues}
                  tickets={liveTickets}
                  lang={lang}
                  onSelectMatch={setSelectedMatchId}
                  onCreateMatch={() => handleOpenCreateMatch()}
                  onViewAllMatches={() => setActiveTab('matches')}
                  onViewStats={() => setActiveTab('stats')}
                  onViewClubs={() => setActiveTab('clubs')}
                  onOpenAds={() => setActiveTab('ads')}
                  onOpenLicenses={() => setActiveTab('licenses')}
                  onPlayerClick={setSelectedPlayer}
                  unreadNotificationsCount={communityNotifications.length}
                  onOpenNotifications={() => setActiveTab('notifications')}
                />
              )}

              {/* Matches Tab */}
              {activeTab === 'matches' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-gray-900">{t.matches}</h1>
                  <div className="space-y-4">
                    {matches.map(match => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        registrations={registrations.filter(r => r.matchId === match.id)}
                        lang={lang}
                        canDelete={isAdmin || match.organizerId === user?.uid}
                        onDelete={handleDeleteMatch}
                        onClick={setSelectedMatchId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stats & Artilharia Tab */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-gray-900">{t.stats}</h1>
                  <Ranking
                    players={allUsers}
                    stats={stats}
                    matches={matches}
                    clubs={clubs}
                    manualScorers={manualScorers}
                    currentUser={user}
                    lang={lang}
                    onPlayerClick={setSelectedPlayer}
                    onSaveManualScorer={handleSaveManualScorer}
                    onDeleteManualScorer={handleDeleteManualScorer}
                  />
                  {user && (
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-4">{t.performance}</h3>
                      <StatsChart
                        stats={stats.filter(s => s.playerId === user.uid)}
                        matches={matches}
                        lang={lang}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Finance Tab */}
              {activeTab === 'finance' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-gray-900">{t.finance}</h1>
                  <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest">Saldo do Grupo</p>
                        <p className="text-2xl font-bold text-emerald-900">
                          {registrations.filter(r => r.paid).reduce((acc, r) => {
                            const match = matches.find(m => m.id === r.matchId);
                            return acc + (match?.price || 0);
                          }, 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Pagamentos Recentes</h3>
                      <div className="divide-y divide-gray-50">
                        {registrations.filter(r => r.paid).slice(0, 10).map(reg => {
                          const player = allUsers.find(u => u.uid === reg.userId);
                          const match = matches.find(m => m.id === reg.matchId);
                          return (
                            <div key={reg.id} className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {player?.photoURL ? (
                                  <img src={player.photoURL} alt={player.displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">{player?.displayName[0]}</div>
                                )}
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{player?.displayName}</p>
                                  <p className="text-[10px] text-gray-400">{match ? format(match.date, 'dd/MM/yyyy') : '---'}</p>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-emerald-600">+{match?.price.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Clubs Tab */}
              {activeTab === 'clubs' && (
                <div className="space-y-6">
                  <ClubManager
                    clubs={clubs}
                    currentUser={user || {
                      uid: 'visitor',
                      displayName: lang === 'pt' ? 'Visitante' : 'Visitor',
                      email: '',
                      ratings: { defense: 3, passing: 3, finishing: 3 },
                      language: lang,
                      createdAt: Date.now(),
                    }}
                    allUsers={allUsers}
                    lang={lang}
                    onSave={handleSaveClub}
                    onUpdate={handleUpdateClub}
                    onDelete={handleDeleteClub}
                    onJoin={handleJoinClub}
                    onLeave={handleLeaveClub}
                    onCreateMatchWithClub={(clubId) => handleOpenCreateMatch(clubId)}
                  />
                </div>
              )}

              {/* Public Community Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <CommunityNotifications
                    notifications={communityNotifications}
                    currentUser={user}
                    lang={lang}
                    onSaveNotification={handleSaveCommunityNotification}
                    onDeleteNotification={handleDeleteCommunityNotification}
                    onLikeNotification={handleLikeCommunityNotification}
                    onRequestLogin={handleLogin}
                    communityLeagues={communityLeagues}
                    licensePayments={licensePayments}
                    onOpenLicenses={() => setActiveTab('licenses')}
                    onSubmitMonthlyPayment={handleSubmitMonthlyPaymentRequest}
                  />
                </div>
              )}

              {/* Community Ads & Sponsors Tab */}
              {activeTab === 'ads' && (
                <div className="space-y-6">
                  <CommunityAdsManager
                    currentUser={user}
                    ads={communityAds}
                    lang={lang}
                    onSaveAd={handleSaveCommunityAd}
                    onDeleteAd={handleDeleteCommunityAd}
                  />
                </div>
              )}

              {/* Community Leagues & Licensing Tab */}
              {activeTab === 'licenses' && (
                <div className="space-y-6">
                  <CommunityLicensePanel
                    currentUser={user}
                    communityLeagues={communityLeagues}
                    licensePayments={licensePayments}
                    allUsers={allUsers}
                    onSaveLeague={handleSaveLeague}
                    onRenewLicense={handleRenewLicense}
                    onToggleLeagueStatus={handleToggleLeagueStatus}
                    onConfirmMonthlyPayment={handleConfirmMonthlyPayment}
                    onCancelOrSuspendLeague={handleCancelOrSuspendLeague}
                    onSubmitPaymentRequest={handleSubmitMonthlyPaymentRequest}
                    onRejectPayment={handleRejectMonthlyPayment}
                    onLiberateUserByEmail={handleLiberateUserByEmail}
                    onSuspendUserAdminByEmail={handleSuspendUserAdminByEmail}
                    onToggleUserPostPermission={handleToggleUserPostPermission}
                  />
                </div>
              )}

              {/* Complaints & Grievance Center Tab (Ouvidoria de Reclamações e Respostas) */}
              {activeTab === 'complaints' && (
                <div className="space-y-6">
                  <ComplaintsCenter
                    currentUser={user}
                    complaints={complaints}
                    lang={lang}
                    onSubmitComplaint={handleSubmitComplaint}
                    onRespondComplaint={handleRespondComplaint}
                    onResolveComplaint={handleResolveComplaint}
                  />
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-gray-900">{t.settings}</h1>
                  {user ? (
                    <ProfileForm
                      user={user}
                      lang={lang}
                      clubs={clubs}
                      onSave={handleSaveProfile}
                    />
                  ) : (
                    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm text-center space-y-4">
                      <p className="text-sm text-gray-600">
                        {lang === 'pt' ? 'Inicie sessão com o Google para configurar o seu perfil de jogador e clube.' : 'Sign in with Google to set up your player profile and club.'}
                      </p>
                      <button
                        onClick={handleLogin}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
                      >
                        {t.loginWithGoogle}
                      </button>
                    </div>
                  )}
                  
                  {isAdmin && (
                    <AdminPanel
                      users={allUsers}
                      currentUser={user}
                      lang={lang}
                      onUpdateRole={handleUpdateUserRole}
                    />
                  )}
                  
                  {(isAdmin || matches.some(m => m.organizerId === user.uid)) && (
                    <PlayerManager
                      players={allUsers.filter(u => u.uid !== user.uid)}
                      lang={lang}
                      onUpdateRating={handleUpdatePlayerRating}
                    />
                  )}

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.language}</h3>
                    <LanguageSelector
                      currentLanguage={lang}
                      onLanguageChange={(l) => {
                        setLang(l);
                        if (user) updateDoc(doc(db, 'users', user.uid), { language: l });
                      }}
                    />
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Star className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{t.creator}</h3>
                        <p className="text-xs text-gray-500">Lázaro Atalia</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t.supportCreatorMsg}
                    </p>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-sm font-bold text-gray-700">878803093</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Movitel</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-sm font-bold text-gray-700">856197909</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Vodacom</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          lang={lang}
          userPhoto={user?.photoURL}
          notificationsCount={communityNotifications.length}
          onLogout={user ? handleLogout : () => setIsVisitor(false)}
        >
          <div className="flex items-center gap-2">
            {user && (
              <NotificationCenter
                notifications={notifications}
                matches={matches}
                language={lang}
                onAccept={handleAcceptInvite}
                onDecline={handleDeclineInvite}
                onDeleteNotification={handleDeleteNotification}
                onClearAllNotifications={handleClearAllNotifications}
              />
            )}
            <button
              onClick={() => handleOpenCreateMatch()}
              className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer"
              title={lang === 'pt' ? 'Criar Jogo' : 'Create Match'}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </Navbar>

        <AnimatePresence>
          {isCreatingMatch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full max-w-md bg-white rounded-t-[32px] md:rounded-[32px] p-6 max-h-[90vh] overflow-y-auto"
              >
                <MatchForm
                  lang={lang}
                  clubs={clubs}
                  allUsers={allUsers}
                  initialClubId={selectedClubIdForMatch}
                  existingLeagues={Array.from(new Set(matches.map(m => m.league?.trim()).filter(Boolean))) as string[]}
                  onSave={(data) => {
                    handleCreateMatch(data);
                    setIsCreatingMatch(false);
                    setSelectedClubIdForMatch(undefined);
                  }}
                  onCancel={() => {
                    setIsCreatingMatch(false);
                    setSelectedClubIdForMatch(undefined);
                  }}
                  onOpenAddClub={() => {
                    setIsCreatingMatch(false);
                    setSelectedClubIdForMatch(undefined);
                    setActiveTab('clubs');
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedPlayer && (
            <PlayerProfileModal
              player={selectedPlayer}
              stats={stats.filter(s => s.playerId === selectedPlayer.uid)}
              lang={lang}
              onClose={() => setSelectedPlayer(null)}
            />
          )}
        </AnimatePresence>

        {/* Post Permission Notice Modal (Apenas Admin, Assinantes Ativos ou Autorizados) */}
        <AnimatePresence>
          {postPermissionNotice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">
                      Permissão de Publicação Restrita
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Be-Lwezer • Gestão Comunitária
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-neutral-950/80 rounded-2xl border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                  {postPermissionNotice}
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-[11px] text-emerald-300 space-y-1">
                  <p className="font-bold">Como obter acesso de Administrador?</p>
                  <p className="text-emerald-200/80">
                    Pague a mensalidade comunitária de <strong>600 MT</strong> via M-Pesa (85 619 79 09) ou e-Mola (87 88 030 93) para Lázaro Atalia, ou entre em contacto através do canal de Reclamações.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPostPermissionNotice(null);
                      setActiveTab('licenses');
                    }}
                    className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Ver Mensalidades (600 MT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPostPermissionNotice(null);
                      setActiveTab('complaints');
                    }}
                    className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>Reclamações</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostPermissionNotice(null)}
                    className="py-3 px-3 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
