import {
  useListTickets,
  useCreateTicket,
  useGetTicket,
  useUpdateTicket,
  useDeleteTicket,
  useUnlockTicket,
  useGetTicketStats,
  getListTicketsQueryKey,
  getGetTicketQueryKey,
  getGetTicketStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ListTicketsParams, CreateTicketBody, UpdateTicketBody, UnlockTicketBody } from "@workspace/api-client-react/src/generated/api.schemas";

export function useTickets(params?: ListTicketsParams) {
  const { data: tickets, isLoading, error } = useListTickets(params);
  return { tickets, isLoading, error };
}

export function useTicketStats() {
  const { data: stats, isLoading, error } = useGetTicketStats();
  return { stats, isLoading, error };
}

export function useTicket(id: number) {
  const { data: ticket, isLoading, error, refetch } = useGetTicket(id, { query: { enabled: !!id, queryKey: getGetTicketQueryKey(id) } });
  return { ticket, isLoading, error, refetch };
}

export function useTicketMutations() {
  const queryClient = useQueryClient();

  const createMutation = useCreateTicket({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTicketStatsQueryKey() });
      },
    },
  });

  const updateMutation = useUpdateTicket({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.setQueryData(getGetTicketQueryKey(variables.id), data);
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTicketStatsQueryKey() });
      },
    },
  });

  const deleteMutation = useDeleteTicket({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTicketStatsQueryKey() });
      },
    },
  });

  const unlockMutation = useUnlockTicket();

  return {
    createTicket: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTicket: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteTicket: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    unlockTicket: unlockMutation.mutateAsync,
    isUnlocking: unlockMutation.isPending,
  };
}
