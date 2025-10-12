import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateQueries } from "@/lib/react-query";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { storeIntegration } from "@/stores/storeIntegration";
import type { Generation, NewGeneration } from "@/db/schema";

// API functions
const generationsApi = {
  getGenerations: async (conversationId: string): Promise<Generation[]> => {
    const response = await fetch(
      `/api/generations?conversationId=${conversationId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch generations");
    }
    return response.json();
  },

  getGeneration: async (id: string): Promise<Generation> => {
    const response = await fetch(`/api/generations/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch generation");
    }
    return response.json();
  },

  createGeneration: async (
    data: Omit<NewGeneration, "id" | "createdAt" | "updatedAt">
  ): Promise<Generation> => {
    const response = await fetch("/api/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create generation");
    }
    return response.json();
  },

  submitClarification: async (
    id: string,
    clarificationResponses: any
  ): Promise<Generation> => {
    const response = await fetch(`/api/generations/${id}/clarify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clarificationResponses }),
    });
    if (!response.ok) {
      throw new Error("Failed to submit clarification");
    }
    return response.json();
  },

  confirmGeneration: async (
    id: string
  ): Promise<{ generation: Generation; jobId: string }> => {
    const response = await fetch(`/api/generations/${id}/confirm`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to confirm generation");
    }
    return response.json();
  },

  updateGenerationStatus: async (
    id: string,
    status: Generation["status"],
    additionalData?: Partial<Generation>
  ): Promise<Generation> => {
    const response = await fetch(`/api/generations/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, ...additionalData }),
    });
    if (!response.ok) {
      throw new Error("Failed to update generation status");
    }
    return response.json();
  },

  getActiveGenerations: async (): Promise<Generation[]> => {
    const response = await fetch("/api/generations?status=active");
    if (!response.ok) {
      throw new Error("Failed to fetch active generations");
    }
    return response.json();
  },

  getPendingClarifications: async (): Promise<Generation[]> => {
    const response = await fetch(
      "/api/generations?status=pending_clarification"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch pending clarifications");
    }
    return response.json();
  },
};

// Query hooks
export const useGenerations = (conversationId: string) => {
  const { setError } = useGenerationStore();

  return useQuery({
    queryKey: queryKeys.generations.list(conversationId),
    queryFn: () => generationsApi.getGenerations(conversationId),
    enabled: !!conversationId,
    onError: (error) => {
      setError(
        error instanceof Error ? error.message : "Failed to fetch generations"
      );
    },
  });
};

export const useGeneration = (id: string) => {
  const { setError } = useGenerationStore();

  return useQuery({
    queryKey: queryKeys.generations.detail(id),
    queryFn: () => generationsApi.getGeneration(id),
    enabled: !!id,
    onError: (error) => {
      setError(
        error instanceof Error ? error.message : "Failed to fetch generation"
      );
    },
  });
};

export const useActiveGenerations = () => {
  const { setError } = useGenerationStore();

  return useQuery({
    queryKey: queryKeys.generations.active(),
    queryFn: generationsApi.getActiveGenerations,
    refetchInterval: 5000, // Poll every 5 seconds
    onError: (error) => {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch active generations"
      );
    },
  });
};

export const usePendingClarifications = () => {
  const { setError } = useGenerationStore();

  return useQuery({
    queryKey: queryKeys.generations.pending(),
    queryFn: generationsApi.getPendingClarifications,
    onError: (error) => {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch pending clarifications"
      );
    },
  });
};

// Polling query for generation status
export const usePollGeneration = (id: string, enabled: boolean = true) => {
  const { updateGenerationStatus, setError } = useGenerationStore();

  return useQuery({
    queryKey: queryKeys.generations.detail(id),
    queryFn: () => generationsApi.getGeneration(id),
    enabled: enabled && !!id,
    refetchInterval: (data) => {
      // Poll every 2 seconds if generation is active
      const isActive =
        data?.status && ["queued", "processing"].includes(data.status);
      return isActive ? 2000 : false;
    },
    onSuccess: (data) => {
      // Update store with latest data
      if (data) {
        updateGenerationStatus(data.id, data.status, data);
      }
    },
    onError: (error) => {
      setError(
        error instanceof Error ? error.message : "Failed to poll generation"
      );
    },
  });
};

// Mutation hooks
export const useRequestGeneration = () => {
  const queryClient = useQueryClient();
  const { requestGeneration, setError } = useGenerationStore();

  return useMutation({
    mutationFn: generationsApi.createGeneration,
    onMutate: async (newGeneration) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.generations.list(newGeneration.conversationId),
      });

      // Optimistically add to store
      const optimisticGeneration: Generation = {
        id: crypto.randomUUID(),
        ...newGeneration,
        status: "pending_clarification",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      requestGeneration(optimisticGeneration);

      return { optimisticGeneration };
    },
    onSuccess: (data, variables) => {
      // Update the store with the actual data from the server
      requestGeneration(data);

      // Invalidate and refetch generations
      invalidateQueries.generations.list(variables.conversationId);
      invalidateQueries.generations.pending();
    },
    onError: (error, variables) => {
      setError(
        error instanceof Error ? error.message : "Failed to request generation"
      );
    },
  });
};

export const useSubmitClarification = () => {
  const queryClient = useQueryClient();
  const { submitClarification, setError } = useGenerationStore();

  return useMutation({
    mutationFn: ({
      id,
      clarificationResponses,
    }: {
      id: string;
      clarificationResponses: any;
    }) => generationsApi.submitClarification(id, clarificationResponses),
    onMutate: async ({ id, clarificationResponses }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.generations.detail(id),
      });

      // Optimistically update in store
      submitClarification(id, clarificationResponses);

      return { id, clarificationResponses };
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      invalidateQueries.generations.detail(variables.id);
      invalidateQueries.generations.pending();
    },
    onError: (error, variables) => {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to submit clarification"
      );
    },
  });
};

export const useConfirmGeneration = () => {
  const queryClient = useQueryClient();
  const { confirmGeneration, setError } = useGenerationStore();

  return useMutation({
    mutationFn: generationsApi.confirmGeneration,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.generations.detail(id),
      });

      // Optimistically update in store
      confirmGeneration(id);

      return { id };
    },
    onSuccess: (data, variables) => {
      // Update store with job ID
      confirmGeneration(variables, data.jobId);

      // Invalidate related queries
      invalidateQueries.generations.detail(variables);
      invalidateQueries.generations.active();
    },
    onError: (error, variables) => {
      setError(
        error instanceof Error ? error.message : "Failed to confirm generation"
      );
    },
  });
};

export const useUpdateGenerationStatus = () => {
  const queryClient = useQueryClient();
  const { updateGenerationStatus, setError } = useGenerationStore();

  return useMutation({
    mutationFn: ({
      id,
      status,
      additionalData,
    }: {
      id: string;
      status: Generation["status"];
      additionalData?: Partial<Generation>;
    }) => generationsApi.updateGenerationStatus(id, status, additionalData),
    onMutate: async ({ id, status, additionalData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.generations.detail(id),
      });

      // Optimistically update in store
      updateGenerationStatus(id, status, additionalData);

      return { id, status, additionalData };
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      invalidateQueries.generations.detail(variables.id);
      invalidateQueries.generations.active();
    },
    onError: (error, variables) => {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update generation status"
      );
    },
  });
};
