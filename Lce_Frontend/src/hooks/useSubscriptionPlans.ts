import { useQuery } from '@tanstack/react-query';
import { subscriptionAPI } from '../services/api';

export const queryKeys = {
    subscriptionPlans: ['subscriptionPlans'] as const,
};

export interface SubscriptionPlan {
    id: number;
    code: string;
    name: string;
    bags_per_month: number;
    price_per_bag: number;
    billing_cycle: 'monthly' | 'annual';
    annual_discount_percent: number;
    monthly_total: number;
    annual_total: number;
    annual_savings: number;
    features: string[];
}

export function useSubscriptionPlans() {
    return useQuery<SubscriptionPlan[]>({
        queryKey: queryKeys.subscriptionPlans,
        queryFn: () => subscriptionAPI.getPlans().then(r => r.data?.plans || []),
        staleTime: 5 * 60 * 1000, 
    });
}
