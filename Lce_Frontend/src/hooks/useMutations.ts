import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentMethodAPI, pickupAPI } from '../services/api';
import { queryKeys } from './useQueries';

interface PaymentMethodsData {
  payment_methods?: { id: number | string }[];
  has_payment_method?: boolean;
}

interface PickupsData {
  pickups?: { id: number }[];
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentMethodAPI.delete(id),

    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: queryKeys.paymentMethods });
      const previous = qc.getQueryData(queryKeys.paymentMethods);

      
      qc.setQueryData(queryKeys.paymentMethods, (old: PaymentMethodsData | undefined) => {
        if (!old) return old;
        const filtered = old.payment_methods?.filter(
          (m) => String(m.id) !== String(id)
        );
        return {
          ...old,
          payment_methods: filtered,
          has_payment_method: (filtered?.length ?? 0) > 0,
        };
      });

      return { previous };
    },

    onError: (_err, _id, context) => {
      
      if (context?.previous) {
        qc.setQueryData(queryKeys.paymentMethods, context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods });
    },
  });
}

export function useCancelPickup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => pickupAPI.cancel(id),

    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: queryKeys.pickups });
      const previous = qc.getQueryData(queryKeys.pickups);

      qc.setQueryData(queryKeys.pickups, (old: PickupsData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pickups: old.pickups?.filter((p) => p.id !== id),
        };
      });

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.pickups, context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pickups });
    },
  });
}
