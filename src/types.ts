export type TechnicalRating = 1 | 2 | 3 | 4 | 5;

export type PlayerPosition = 
  | 'GK'   // Guarda-Redes / Goleiro
  | 'CB'   // Defesa Central
  | 'LB'   // Lateral Esquerdo
  | 'RB'   // Lateral Direito
  | 'CDM'  // Médio Defensivo / Volante
  | 'CM'   // Médio Centro
  | 'CAM'  // Médio Ofensivo
  | 'LW'   // Extremo / Ponta Esquerda
  | 'RW'   // Extremo / Ponta Direita
  | 'ST';  // Avançado / Centroavante

export interface PlayerRatings {
  defense: TechnicalRating;
  passing: TechnicalRating;
  finishing: TechnicalRating;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  ratings: PlayerRatings;
  language: 'pt' | 'en' | 'xangana';
  createdAt: number;
  description?: string;
  position?: PlayerPosition | string;
  phoneNumber?: string;
  clubId?: string; // Reference to Club.id
  clubName?: string; // Denormalized for easy access
  clubLogoURL?: string; // Denormalized for easy access
  role?: 'user' | 'admin';
  // Account payment & subscription status
  accountStatus?: 'free' | 'paid' | 'active' | 'pending' | 'suspended';
  paidStatus?: 'paid' | 'unpaid' | 'pending';
  subscriptionStatus?: 'active' | 'pending' | 'expired' | 'none';
  subscriptionExpiresAt?: number;
  lastPaymentAt?: number;
  lastPaymentType?: 'monthly_subscription' | 'live_ticket' | 'other';
  hasLiveAccess?: boolean;
  purchasedLiveMatchIds?: string[];
  communityLeagueId?: string;
  canPostContent?: boolean;
  canPostNews?: boolean;
}

export interface ClubPlayer {
  id: string; // Unique ID or userId
  name: string;
  position?: PlayerPosition | string;
  number?: number;
  photoURL?: string;
  userId?: string;
}

export interface Club {
  id: string;
  name: string;
  logoURL?: string;
  president?: string;
  coach?: string;
  description?: string;
  foundedAt?: number;
  location?: string;
  league?: string; // Championship / League where club plays
  createdBy: string;
  playerIds?: string[]; // user IDs of players in the club
  players?: string[]; // names of squad players (legacy and quick list)
  playerRoster?: ClubPlayer[]; // Detailed roster with positions and numbers
}

export interface Transfer {
  id: string;
  playerId: string;
  playerName: string;
  playerPhoto?: string;
  fromClub?: string;
  toClub: string;
  date: number;
}

export interface MatchTimer {
  status: 'stopped' | 'running' | 'paused' | 'halftime' | 'finished';
  currentMinute: number; // 0 to 90+
  stoppageMinutes: number; // e.g. +2, +5 added time
  half: 1 | 2;
  elapsedSeconds: number; // in seconds
  startedAt?: number; // timestamp ms
  lastPausedAt?: number;
  lastUpdated?: number;
}

export interface LineupPlayer {
  id: string; // registration ID or playerId
  playerId: string;
  playerName: string;
  playerPhoto?: string;
  position: PlayerPosition | string;
  number?: number;
  isStarter: boolean; // true = 11 inicial, false = banco / suplente
  team: 'A' | 'B';
  yellowCards: number; // 0, 1, 2
  redCards: number; // 0, 1
  goals: number;
  assists: number;
  gridX?: number; // 0 - 100 pitch X coordinate
  gridY?: number; // 0 - 100 pitch Y coordinate
}

export interface MatchLineup {
  teamAFormation: string; // '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2' | '7-a-side'
  teamBFormation: string;
  players: LineupPlayer[];
}

export interface MatchLiveStream {
  isLive: boolean;
  broadcasterId: string;
  broadcasterName: string;
  price: number; // MZN amount to watch (0 = free)
  viewerCount: number;
  viewers?: string[]; // user IDs currently in live
  startedAt?: number;
  streamStatus?: 'live' | 'ended';
}

export type SetPieceType = 'penalty' | 'free_kick';
export type SetPieceOutcome = 'goal' | 'saved' | 'post' | 'missed' | 'wall';

export interface MatchLiveEvent {
  id: string;
  matchId: string;
  minute: number;
  type: SetPieceType | 'goal' | 'yellow_card' | 'red_card' | 'substitution';
  team: 'A' | 'B';
  teamName: string;
  takerId?: string;
  takerName?: string;
  playerName?: string;
  substitutedPlayerName?: string;
  assistantId?: string;
  assistantName?: string;
  goalkeeperId?: string;
  goalkeeperName?: string;
  outcome?: SetPieceOutcome;
  description: string;
  createdAt: number;
}

export interface LiveTicket {
  id: string;
  matchId: string;
  userId: string;
  userName?: string;
  amount: number;
  paidAt: number;
  paymentMethod: 'mpesa' | 'emola' | 'card' | 'cash';
  status?: 'completed' | 'pending' | 'failed';
}

export interface LiveChatMessage {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  badge?: 'broadcaster' | 'admin' | 'spectator' | string;
  createdAt: number;
}

export interface CommunityAd {
  id: string;
  title: string;
  businessName: string;
  description: string;
  imageURL?: string;
  phone?: string;
  whatsapp?: string;
  category: string; // e.g. "Restaurante", "Oficina", "Barbearia", "Loja", "Bebidas", "Serviços"
  location?: string;
  active: boolean;
  createdBy: string;
  createdAt: number;
  views?: number;
  clicks?: number;
}

export interface Match {
  id: string;
  date: number; // timestamp
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  price: number;
  maxPlayers: number;
  status: 'open' | 'full' | 'in_progress' | 'finished' | 'cancelled';
  organizerId: string;
  description?: string;
  scoreA?: number;
  scoreB?: number;
  teamAName?: string;
  teamBName?: string;
  teamAClubId?: string;
  teamBClubId?: string;
  teamALogoURL?: string;
  teamBLogoURL?: string;
  league?: string; // Championship / League name
  timer?: MatchTimer;
  lineup?: MatchLineup;
  playerNames?: string[]; // Strings of player names in match squad
  squadNames?: string[]; // Quick list of all players in match
  teamAPlayerNames?: string[];
  teamBPlayerNames?: string[];
  liveStream?: MatchLiveStream;
  liveEvents?: MatchLiveEvent[];
  photos?: MatchPhoto[];
}

export interface MatchPhoto {
  id: string;
  matchId: string;
  url: string;
  caption?: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByPhoto?: string;
  createdAt: number;
}

export interface Registration {
  id: string;
  matchId: string;
  userId: string;
  status: 'confirmed' | 'waiting';
  paid: boolean;
  registeredAt: number;
}

export interface MatchStats {
  id: string;
  matchId: string;
  playerId: string;
  goals: number;
  assists: number;
  isMOTM: boolean;
  yellowCards?: number;
  redCards?: number;
}

export interface TeamDivision {
  matchId: string;
  teams: {
    teamA: string[]; // userIds
    teamB: string[]; // userIds
  };
}

export interface Notification {
  id: string;
  userId: string;
  matchId?: string;
  type: 'invite' | 'waiting_list_promotion' | 'match_cancelled' | 'payment_confirmed' | 'subscription_active' | 'live_ticket_unlocked' | 'monthly_payment_pending' | 'monthly_payment_confirmed' | 'monthly_payment_rejected' | 'subscription_suspended';
  status: 'pending' | 'accepted' | 'declined' | 'read';
  createdAt: number;
  title?: string;
  message?: string;
  amount?: number;
  paymentMethod?: string;
}

export interface CommunityNotification {
  id: string;
  title: string;
  message: string;
  authorName: string;
  authorId?: string;
  authorPhoto?: string;
  category?: 'general' | 'match' | 'tournament' | 'alert' | 'transfer' | 'club';
  priority?: 'normal' | 'urgent';
  createdAt: number;
  likes?: number;
  likedBy?: string[];
  leagueName?: string;
}

export interface ManualScorer {
  id: string;
  playerName: string;
  goals: number;
  assists?: number;
  motmCount?: number;
  yellowCards?: number;
  redCards?: number;
  clubName?: string;
  clubLogoURL?: string;
  league?: string;
  photoURL?: string;
  matchesPlayed?: number;
  createdAt: number;
  createdBy?: string;
  createdByName?: string;
}

export type LicenseStatus = 'active' | 'pending' | 'expired';

export interface CommunityLeague {
  id: string;
  name: string;
  responsibleAdminEmail: string;
  responsibleAdminName?: string;
  responsibleAdminPhone?: string;
  adminUserId?: string;
  monthlyFee: number; // in MZN, 600 MT
  status: LicenseStatus;
  expiresAt: number; // timestamp in ms
  createdAt: number;
  neighborhood?: string;
  city?: string;
  logoURL?: string;
  notes?: string;
  confirmedByAdmin?: boolean;
  confirmedAt?: number;
  statusReason?: string;
  canPostNews?: boolean;
}

export interface LicensePayment {
  id: string;
  leagueId?: string;
  leagueName: string;
  amount: number;
  paymentMethod: 'mpesa' | 'emola';
  phoneNumber: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed' | 'rejected';
  paidAt: number;
  validUntil: number;
  processedBy?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  notes?: string;
  confirmedByAdmin?: boolean;
  confirmedAt?: number;
  rejectionReason?: string;
}

export type ComplaintCategory = 'league' | 'match' | 'subscription' | 'club' | 'referee' | 'technical' | 'other';
export type ComplaintStatus = 'pending' | 'answered' | 'resolved';

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  phoneNumber?: string;
  title: string;
  message: string;
  category?: ComplaintCategory | string;
  status: ComplaintStatus;
  adminResponse?: string;
  respondedAt?: number;
  respondedBy?: string;
  createdAt: number;
}
