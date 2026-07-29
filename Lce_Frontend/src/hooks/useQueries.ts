import { useQuery } from '@tanstack/react-query';
import {
  invoiceAPI,
  transactionAPI,
  paymentMethodAPI,
  preferencesAPI,
  communicationAPI,
  pickupAPI,
  promoCodeAPI,
  subscriptionAPI,
  vacationHoldAPI,
  utilityAPI,
} from '../services/api';


export const queryKeys = {
  invoices: ['invoices'] as const,
  transactions: ['transactions'] as const,
  paymentMethods: ['paymentMethods'] as const,
  preferences: ['preferences'] as const,
  communications: ['communications'] as const,
  pickups: ['pickups'] as const,
  promos: ['promos'] as const,
  recurringSchedule: ['recurringSchedule'] as const,
  services: ['services'] as const,
  prices: ['prices'] as const,
  vacationHolds: ['vacationHolds'] as const,
  subscriptions: ['subscriptions'] as const,
  pickupZone: ['pickupZone'] as const,
};



export function useInvoices(params?: Parameters<typeof invoiceAPI.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.invoices, params],
    queryFn: () => invoiceAPI.list(params).then(r => r.data),
  });
}

export function useTransactions(params?: Parameters<typeof transactionAPI.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.transactions, params],
    queryFn: () => transactionAPI.list(params).then(r => r.data),
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: () => paymentMethodAPI.list().then(r => r.data),
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => preferencesAPI.get().then(r => r.data),
  });
}

export function useCommunicationSettings() {
  return useQuery({
    queryKey: queryKeys.communications,
    queryFn: () => communicationAPI.get().then(r => r.data),
  });
}

export function usePickups(params?: Parameters<typeof pickupAPI.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.pickups, params],
    queryFn: () => pickupAPI.list(params).then(r => r.data),
  });
}

export function usePromos() {
  return useQuery({
    queryKey: queryKeys.promos,
    queryFn: () => promoCodeAPI.list().then(r => r.data),
  });
}

export function useRecurringSchedule() {
  return useQuery({
    queryKey: queryKeys.recurringSchedule,
    queryFn: () => pickupAPI.getRecurringSchedule().then(r => r.data),
  });
}

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => pickupAPI.getServices().then(r => r.data),
  });
}

export function usePrices() {
  return useQuery({
    queryKey: queryKeys.prices,
    queryFn: () => utilityAPI.getPrices().then(r => r.data),
  });
}

export function useVacationHolds() {
  return useQuery({
    queryKey: queryKeys.vacationHolds,
    queryFn: () => vacationHoldAPI.list().then(r => r.data),
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions,
    queryFn: () => subscriptionAPI.list().then(r => r.data),
  });
}

export function usePickupZone(zip?: string) {
  return useQuery({
    queryKey: [...queryKeys.pickupZone, zip],
    queryFn: () => utilityAPI.checkZone(zip!).then(r => r.data),
    enabled: !!zip && zip.length >= 5,
    staleTime: 5 * 60 * 1000, 
  });
}

