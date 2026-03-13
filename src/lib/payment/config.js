export const PAYMENT_CONFIG = {
  ACTIVE_PROVIDER: process.env.ACTIVE_PAYMENT_PROVIDER || 'paystack',
  
  // Flutterwave Configuration
  flutterwave: {
    publicKey: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
    baseURL: 'https://api.flutterwave.com/v3',
    name: 'Flutterwave',
    logo: '/images/flutterwave-logo.png',
    supportedMethods: ['card', 'bank_transfer', 'ussd', 'mobile_money'],
    currency: 'NGN',
    testMode: process.env.NODE_ENV !== 'production',
  },
  
  // Paystack Configuration
  paystack: {
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    baseURL: 'https://api.paystack.co',
    name: 'Paystack',
    logo: '/images/paystack-logo.png',
    supportedMethods: ['card', 'bank_transfer', 'ussd', 'qr'],
    currency: 'NGN',
    testMode: process.env.NODE_ENV !== 'production',
  },
  
  // Stripe Configuration (Future)
  stripe: {
    publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    baseURL: 'https://api.stripe.com/v1',
    name: 'Stripe',
    logo: '/images/stripe-logo.png',
    supportedMethods: ['card'],
    currency: 'USD',
    testMode: process.env.NODE_ENV !== 'production',
  },
};

export function getActiveProvider() {
  const provider = PAYMENT_CONFIG[PAYMENT_CONFIG.ACTIVE_PROVIDER];
  
  if (!provider) {
    throw new Error(`Payment provider ${PAYMENT_CONFIG.ACTIVE_PROVIDER} not configured`);
  }
  
  return {
    ...provider,
    providerName: PAYMENT_CONFIG.ACTIVE_PROVIDER,
  };
}

export function getProviderName() {
  return PAYMENT_CONFIG.ACTIVE_PROVIDER;
}

export function isProviderConfigured(providerName) {
  const provider = PAYMENT_CONFIG[providerName || PAYMENT_CONFIG.ACTIVE_PROVIDER];
  return !!(provider?.publicKey && provider?.secretKey);
}