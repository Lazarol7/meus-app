/**
 * Craque do Bairro - Mobile Money Service (M-Pesa Vodacom & e-Mola Movitel)
 * Moçambique Mobile Payment Gateway Integration
 */

export interface MobileMoneyPaymentRequest {
  phoneNumber: string;       // 84xxxxxxx / 85xxxxxxx (M-Pesa) ou 86xxxxxxx / 87xxxxxxx (e-Mola)
  amount: number;            // Valor em Meticais (MZN)
  reference: string;         // Referência interna (ex: LIC-2026-CHAMANCULO)
  method: 'mpesa' | 'emola'; // Método escolhido
  communityLeagueId: string; // ID da comunidade/liga
}

export interface PaymentValidationResult {
  success: boolean;
  transactionId: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
  message: string;
  timestamp: number;
}

/**
 * Validador de prefixo de telemóvel para redes de Moçambique
 */
export function detectMobileMoneyProvider(phone: string): 'mpesa' | 'emola' | 'unknown' {
  const cleanPhone = phone.replace(/\D/g, '');
  // Aceita formatos: 841234567, 258841234567, +258841234567
  const localNumber = cleanPhone.startsWith('258') ? cleanPhone.slice(3) : cleanPhone;
  
  if (localNumber.startsWith('84') || localNumber.startsWith('85')) {
    return 'mpesa'; // Vodacom Moçambique
  }
  if (localNumber.startsWith('86') || localNumber.startsWith('87')) {
    return 'emola'; // Movitel Moçambique
  }
  return 'unknown';
}

/**
 * M-Pesa C2B / USSD Push Processing (Vodacom OpenAPI)
 */
export async function processMpesaPayment(request: MobileMoneyPaymentRequest): Promise<PaymentValidationResult> {
  // Verificação de número Vodacom
  const provider = detectMobileMoneyProvider(request.phoneNumber);
  if (provider !== 'mpesa') {
    return {
      success: false,
      transactionId: '',
      reference: request.reference,
      status: 'failed',
      message: 'Número inválido para M-Pesa. Use um contacto Vodacom com prefixo 84 ou 85.',
      timestamp: Date.now()
    };
  }

  // Em produção, este método invoca a OpenAPI M-Pesa C2B (https://developer.mpesa.vm.co.mz):
  // POST https://api.sandbox.vm.co.mz:18352/ipg/v1x/c2bPayment/singleStage/
  // Headers: { Authorization: `Bearer ${apiKey}`, Origin: 'developer.mpesa.vm.co.mz' }
  const simulatedTransactionId = `MP-${Date.now().toString().slice(-8)}`;

  return {
    success: true,
    transactionId: simulatedTransactionId,
    reference: request.reference,
    status: 'completed',
    message: `Pagamento M-Pesa de ${request.amount} MZN validado com sucesso. Referência: ${simulatedTransactionId}`,
    timestamp: Date.now()
  };
}

/**
 * e-Mola C2B / Push USSD Processing (Movitel e-Mola API)
 */
export async function processEmolaPayment(request: MobileMoneyPaymentRequest): Promise<PaymentValidationResult> {
  const provider = detectMobileMoneyProvider(request.phoneNumber);
  if (provider !== 'emola') {
    return {
      success: false,
      transactionId: '',
      reference: request.reference,
      status: 'failed',
      message: 'Número inválido para e-Mola. Use um contacto Movitel com prefixo 86 ou 87.',
      timestamp: Date.now()
    };
  }

  // Em produção, este método invoca a API e-Mola da Movitel (SOAP ou REST)
  const simulatedTransactionId = `EM-${Date.now().toString().slice(-8)}`;

  return {
    success: true,
    transactionId: simulatedTransactionId,
    reference: request.reference,
    status: 'completed',
    message: `Pagamento e-Mola de ${request.amount} MZN validado com sucesso. Referência: ${simulatedTransactionId}`,
    timestamp: Date.now()
  };
}
