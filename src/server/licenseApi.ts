/**
 * Craque do Bairro - Community Licensing & Subscription API
 * Endpoints para verificação de status, bloqueio de acesso e renovação via M-Pesa / e-Mola
 */

import { Router, Request, Response } from 'express';
import { processMpesaPayment, processEmolaPayment, detectMobileMoneyProvider } from './mobileMoneyService';

export const licenseApiRouter = Router();

// Middleware de verificação de bloqueio de comunidade
export function checkCommunityAccessStatus(expiresAt: number, status: 'active' | 'pending' | 'expired') {
  const isExpired = Date.now() > expiresAt || status === 'expired';
  return {
    isBlocked: isExpired,
    status: isExpired ? 'expired' : status,
    daysRemaining: Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)),
    reason: isExpired ? 'Acesso temporariamente bloqueado. Regularize a licença mensal da liga comunitária.' : null
  };
}

/**
 * GET /api/licenses/:leagueId/status
 * Retorna o estado da assinatura da comunidade para o Administrador
 */
licenseApiRouter.get('/licenses/:leagueId/status', async (req: Request, res: Response) => {
  const { leagueId } = req.params;

  try {
    // Simulação de consulta ao Firestore / Banco de dados relacional
    // Exemplo de resposta calculada
    const now = Date.now();
    const expiresAt = now + 15 * 24 * 60 * 60 * 1000; // Exemplo: 15 dias restantes
    const accessCheck = checkCommunityAccessStatus(expiresAt, 'active');

    return res.json({
      success: true,
      leagueId,
      status: accessCheck.status,
      isBlocked: accessCheck.isBlocked,
      daysRemaining: accessCheck.daysRemaining,
      monthlyFee: 500,
      currency: 'MZN',
      blockReason: accessCheck.reason,
      validUntil: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar estado da licença.',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/licenses/:leagueId/renew
 * Gera solicitação de renovação mensal e processa via Mobile Money (M-Pesa / e-Mola)
 */
licenseApiRouter.post('/licenses/:leagueId/renew', async (req: Request, res: Response) => {
  const { leagueId } = req.params;
  const { phoneNumber, paymentMethod, months = 1, requestedBy } = req.body;

  if (!phoneNumber || !paymentMethod) {
    return res.status(400).json({
      success: false,
      message: 'Número de telefone e método de pagamento (mpesa ou emola) são obrigatórios.'
    });
  }

  const detected = detectMobileMoneyProvider(phoneNumber);
  if (detected !== paymentMethod) {
    return res.status(400).json({
      success: false,
      message: `Número incompatível com ${paymentMethod}. Use 84/85 para M-Pesa ou 86/87 para e-Mola.`
    });
  }

  const monthlyFee = 500;
  const totalAmount = monthlyFee * Number(months);
  const reference = `CRAQUE-LIC-${Date.now().toString().slice(-6)}`;

  try {
    // 1. Processamento via Mobile Money
    const paymentResult = paymentMethod === 'mpesa'
      ? await processMpesaPayment({ phoneNumber, amount: totalAmount, reference, method: 'mpesa', communityLeagueId: leagueId })
      : await processEmolaPayment({ phoneNumber, amount: totalAmount, reference, method: 'emola', communityLeagueId: leagueId });

    if (!paymentResult.success) {
      return res.status(422).json({
        success: false,
        message: paymentResult.message,
      });
    }

    // 2. Extensão do período de validade (30 dias por cada mês pago)
    const daysToAdd = months * 30;
    const newExpiresAt = Date.now() + daysToAdd * 24 * 60 * 60 * 1000;

    return res.json({
      success: true,
      message: `Renovação de licença aprovada via ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola'}.`,
      payment: {
        transactionId: paymentResult.transactionId,
        reference: paymentResult.reference,
        amount: totalAmount,
        currency: 'MZN',
        status: 'completed',
        paidAt: paymentResult.timestamp,
        processedBy: requestedBy || 'API',
      },
      leagueUpdate: {
        leagueId,
        newStatus: 'active',
        newExpiresAt,
        daysExtended: daysToAdd,
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha interna ao processar pagamento de renovação.',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/payments/webhook
 * Recebe notificações instantâneas de pagamento (IPN) do M-Pesa / e-Mola
 */
licenseApiRouter.post('/payments/webhook', async (req: Request, res: Response) => {
  const { transactionId, status, reference, amount } = req.body;

  // Em produção, validação de assinatura HMAC / certificado SSL do webhook da operadora
  console.log(`[Webhook Mobile Money] Recebido: ${reference} - ${status} (${amount} MZN)`);

  return res.status(200).json({
    received: true,
    processedAt: Date.now()
  });
});

/**
 * GET /api/lives/active
 * Lista todas as partidas que estão sendo transmitidas simultaneamente
 */
licenseApiRouter.get('/lives/active', async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    timestamp: Date.now(),
    message: 'Central de Jogos Ao Vivo Simultâneos'
  });
});
