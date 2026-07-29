import { useSubscriptions } from './useQueries';
import type { UserSubscription } from '../services/api';

interface UseDashboardSubscriptionReturn {
    activeSubscription: UserSubscription | null;
    pendingChange: UserSubscription | null;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

export function useDashboardSubscription(): UseDashboardSubscriptionReturn {
    const { data, isLoading, refetch } = useSubscriptions();

    const subscriptions: UserSubscription[] = data?.subscriptions || [];
    const activeSubscription = subscriptions.find(s => s.status === 'active' || s.status === 'cancelled_pending') || null;
    const pendingChange = subscriptions.find(s => s.status === 'pending') || null;

    return {
        activeSubscription,
        pendingChange,
        isLoading,
        refresh: async () => { await refetch(); },
    };
}

