import client from './client';

export interface SubscriptionStatus {
    tier: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
}

export const createCheckoutSession = async (tier: 'pro' | 'premium') => {
    const res = await client.post('/payment/create-checkout-session', { tier });
    return res.data;
};

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
    const res = await client.get('/payment/subscription-status');
    return res.data;
};

export const createPortalSession = async () => {
    const res = await client.post('/payment/create-portal-session');
    return res.data;
};
