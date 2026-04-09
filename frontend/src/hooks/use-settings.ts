import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function useSettings() {
  const { data: settings, isLoading, error } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  
  const queryClient = useQueryClient();
  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetSettingsQueryKey(), data);
      }
    }
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
