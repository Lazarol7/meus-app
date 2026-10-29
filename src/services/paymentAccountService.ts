/**
 * Craque do Bairro - Payment & Account Status Service
 * Gerencia a ativação automática do status da conta do usuário para 'pago',
 * liberação de acesso a transmissões ao vivo (live matches) e renovação
 * de mensalidade de ligas comunitárias, além da gestão e exclusão de notificações.
 */

import { 
  doc, 
  updateDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  arrayUnion, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, LiveTicket, LicensePayment, Notification } from '../types';

export interface PaymentConfirmationPayload {
  userId: string;
  userName?: string;
  userEmail?: string;
  type: 'monthly_subscription' | 'live_ticket';
  amount: number;
  paymentMethod: 'mpesa' | 'emola' | 'card' | 'cash';
  matchId?: string;
  leagueId?: string;
  leagueName?: string;
  phoneNumber?: string;
  reference?: string;
  validDays?: number; // padrão: 30 dias para mensalidade
}

export interface ActivationResult {
  success: boolean;
  message: string;
  accountStatus: 'paid';
  lastPaymentAt: number;
  updatedFields: Partial<UserProfile>;
  ticketId?: string;
  paymentId?: string;
  notificationId?: string;
}

/**
 * Função principal no banco de dados para ativar o status da conta do usuário para 'pago'
 * e liberar acesso instantâneo para mensalidade e/ou live stream.
 */
export async function activateUserPaymentStatus(
  payload: PaymentConfirmationPayload
): Promise<ActivationResult> {
  const now = Date.now();
  const validDays = payload.validDays || 30;
  const expiresAt = now + validDays * 24 * 60 * 60 * 1000;
  const reference = payload.reference || `CRQ-${Date.now().toString().slice(-6)}`;

  try {
    const updatedFields: Partial<UserProfile> = {
      accountStatus: 'paid',
      paidStatus: 'paid',
      lastPaymentAt: now,
      lastPaymentType: payload.type,
    };

    // 1. Atualizar campos específicos de acordo com o tipo de pagamento
    if (payload.type === 'monthly_subscription') {
      updatedFields.subscriptionStatus = 'active';
      updatedFields.subscriptionExpiresAt = expiresAt;
      if (payload.leagueId) {
        updatedFields.communityLeagueId = payload.leagueId;
      }
    } else if (payload.type === 'live_ticket') {
      updatedFields.hasLiveAccess = true;
      if (payload.matchId) {
        updatedFields.purchasedLiveMatchIds = [payload.matchId];
      }
    }

    // 2. Persistir no documento do usuário em 'users/{userId}'
    const userRef = doc(db, 'users', payload.userId);
    const userDocUpdates: Record<string, any> = {
      accountStatus: 'paid',
      paidStatus: 'paid',
      lastPaymentAt: now,
      lastPaymentType: payload.type,
    };

    if (payload.type === 'monthly_subscription') {
      userDocUpdates.subscriptionStatus = 'active';
      userDocUpdates.subscriptionExpiresAt = expiresAt;
      if (payload.leagueId) {
        userDocUpdates.communityLeagueId = payload.leagueId;
      }
    } else if (payload.type === 'live_ticket' && payload.matchId) {
      userDocUpdates.hasLiveAccess = true;
      userDocUpdates.purchasedLiveMatchIds = arrayUnion(payload.matchId);
    }

    await setDoc(userRef, userDocUpdates, { merge: true });

    let ticketId: string | undefined;
    let paymentId: string | undefined;

    // 3. Registrar o pagamento na respectiva coleção financeira
    if (payload.type === 'monthly_subscription' && payload.leagueId) {
      const paymentDoc = await addDoc(collection(db, 'license_payments'), {
        leagueId: payload.leagueId,
        leagueName: payload.leagueName || 'Liga do Bairro',
        amount: payload.amount,
        paymentMethod: payload.paymentMethod === 'card' || payload.paymentMethod === 'cash' ? 'mpesa' : payload.paymentMethod,
        phoneNumber: payload.phoneNumber || '',
        reference,
        status: 'completed',
        paidAt: now,
        validUntil: expiresAt,
        processedBy: payload.userId,
      });
      paymentId = paymentDoc.id;

      // Ativar e renovar data de expiração da liga da comunidade
      await updateDoc(doc(db, 'community_leagues', payload.leagueId), {
        status: 'active',
        expiresAt,
      }).catch((err) => {
        console.warn('Aviso ao atualizar liga comunitária:', err);
      });
    } else if (payload.type === 'live_ticket' && payload.matchId) {
      const ticketDoc = await addDoc(collection(db, 'live_tickets'), {
        matchId: payload.matchId,
        userId: payload.userId,
        userName: payload.userName || 'Espectador',
        amount: payload.amount,
        paidAt: now,
        paymentMethod: payload.paymentMethod,
        status: 'completed',
      });
      ticketId = ticketDoc.id;
    }

    // 4. Gerar notificação automática de confirmação para o utilizador
    const notifMsg = payload.type === 'monthly_subscription'
      ? `A sua mensalidade de ${payload.amount} MZN foi confirmada! O acesso à liga está ativo até ${new Date(expiresAt).toLocaleDateString('pt-MZ')}.`
      : `O seu bilhete da transmissão ao vivo de ${payload.amount} MZN foi confirmado! O feed de vídeo está liberado.`;

    const notifDoc = await addDoc(collection(db, 'notifications'), {
      userId: payload.userId,
      matchId: payload.matchId || '',
      type: payload.type === 'monthly_subscription' ? 'subscription_active' : 'live_ticket_unlocked',
      status: 'pending',
      title: payload.type === 'monthly_subscription' ? 'Mensalidade Ativada!' : 'Live Liberada!',
      message: notifMsg,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      createdAt: now,
    });

    return {
      success: true,
      message: 'Status da conta alterado para pago com sucesso e acesso liberado!',
      accountStatus: 'paid',
      lastPaymentAt: now,
      updatedFields,
      ticketId,
      paymentId,
      notificationId: notifDoc.id,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'users');
    throw error;
  }
}

/**
 * Elimina uma notificação individual do utilizador.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'notifications');
  }
}

/**
 * Elimina todas as notificações associadas ao utilizador de uma só vez (Limpeza de Caixa).
 */
export async function clearAllNotifications(userId: string): Promise<number> {
  try {
    const notifsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snapshot = await getDocs(notifsQuery);
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    return snapshot.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'notifications');
    return 0;
  }
}
