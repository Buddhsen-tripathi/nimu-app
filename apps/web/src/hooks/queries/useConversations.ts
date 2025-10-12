import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateQueries } from "@/lib/react-query";
import { useConversationStore } from "@/stores/useConversationStore";
import type { Conversation, NewConversation } from "@/db/schema";

// API functions (these would call the actual API endpoints)
const conversationsApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const response = await fetch("/api/conversations");
    if (!response.ok) {
      throw new Error("Failed to fetch conversations");
    }
    const data = await response.json();
    return data.conversations;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const response = await fetch(`/api/conversations/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch conversation");
    }
    return response.json();
  },

  createConversation: async (
    data: Omit<NewConversation, "id" | "createdAt" | "updatedAt">
  ): Promise<Conversation> => {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create conversation");
    }
    return response.json();
  },

  updateConversation: async (
    id: string,
    data: Partial<Conversation>
  ): Promise<Conversation> => {
    const response = await fetch(`/api/conversations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update conversation");
    }
    return response.json();
  },

  deleteConversation: async (id: string): Promise<void> => {
    const response = await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete conversation");
    }
  },

  searchConversations: async (query: string): Promise<Conversation[]> => {
    const response = await fetch(
      `/api/conversations?query=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error("Failed to search conversations");
    }
    const data = await response.json();
    return data.conversations;
  },
};

// Query hooks
export const useConversations = () => {
  const { loadConversations, setLoading, setError } = useConversationStore();

  const query = useQuery({
    queryKey: queryKeys.conversations.lists(),
    queryFn: conversationsApi.getConversations,
  });

  // Handle side effects with useEffect
  React.useEffect(() => {
    if (query.data) {
      loadConversations(query.data);
    }
  }, [query.data, loadConversations]);

  React.useEffect(() => {
    if (query.error) {
      setError(
        query.error instanceof Error
          ? query.error.message
          : "Failed to fetch conversations"
      );
    }
  }, [query.error, setError]);

  React.useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  return query;
};

export const useConversation = (id: string) => {
  const { getConversationById, setError } = useConversationStore();

  const query = useQuery({
    queryKey: queryKeys.conversations.detail(id),
    queryFn: () => conversationsApi.getConversation(id),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (query.error) {
      setError(
        query.error instanceof Error
          ? query.error.message
          : "Failed to fetch conversation"
      );
    }
  }, [query.error, setError]);

  return query;
};

export const useSearchConversations = (searchQuery: string) => {
  const { setError } = useConversationStore();

  const query = useQuery({
    queryKey: queryKeys.conversations.search(searchQuery),
    queryFn: () => conversationsApi.searchConversations(searchQuery),
    enabled: !!searchQuery && searchQuery.length > 0,
  });

  React.useEffect(() => {
    if (query.error) {
      setError(
        query.error instanceof Error
          ? query.error.message
          : "Failed to search conversations"
      );
    }
  }, [query.error, setError]);

  return query;
};

// Mutation hooks
export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { createConversation, setError } = useConversationStore();

  return useMutation({
    mutationFn: conversationsApi.createConversation,
    onMutate: async (newConversation) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.lists(),
      });

      // Optimistically update the store
      const optimisticConversation: Conversation = {
        id: crypto.randomUUID(),
        ...newConversation,
        status: newConversation.status || "active",
        type: newConversation.type || "general_chat",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: null,
        lastMessage: null,
      } as Conversation;

      createConversation(optimisticConversation);

      return { optimisticConversation };
    },
    onSuccess: (data) => {
      // Update the store with the actual data from the server
      createConversation(data);

      // Invalidate and refetch conversations
      invalidateQueries.conversations.list();
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.optimisticConversation) {
        // You would need to implement a revert function in the store
        console.error(
          "Failed to create conversation, reverting optimistic update"
        );
      }

      setError(
        error instanceof Error ? error.message : "Failed to create conversation"
      );
    },
  });
};

export const useUpdateConversation = () => {
  const queryClient = useQueryClient();
  const { updateConversation, setError } = useConversationStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Conversation> }) =>
      conversationsApi.updateConversation(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.detail(id),
      });

      // Optimistically update the store
      updateConversation(id, data);

      return { id, data };
    },
    onSuccess: (data, variables) => {
      // Update the store with the actual data from the server
      updateConversation(variables.id, data);

      // Invalidate related queries
      invalidateQueries.conversations.detail(variables.id);
      invalidateQueries.conversations.list();
    },
    onError: (error, variables) => {
      setError(
        error instanceof Error ? error.message : "Failed to update conversation"
      );
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const { deleteConversation, setError } = useConversationStore();

  return useMutation({
    mutationFn: conversationsApi.deleteConversation,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.lists(),
      });

      // Optimistically remove from store
      deleteConversation(id);

      return { id };
    },
    onSuccess: (data, id) => {
      // Invalidate and refetch conversations
      invalidateQueries.conversations.list();
    },
    onError: (error, id) => {
      // Revert optimistic update on error
      // You would need to implement a revert function in the store
      console.error(
        "Failed to delete conversation, reverting optimistic update"
      );

      setError(
        error instanceof Error ? error.message : "Failed to delete conversation"
      );
    },
  });
};

export const useToggleConversationPin = () => {
  const queryClient = useQueryClient();
  const { togglePin, setError } = useConversationStore();

  return useMutation({
    mutationFn: async (id: string) => {
      // This would be a PATCH request to toggle pin status
      const response = await fetch(`/api/conversations/${id}/toggle-pin`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to toggle conversation pin");
      }
      return response.json();
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.lists(),
      });

      // Optimistically toggle in store
      togglePin(id);

      return { id };
    },
    onSuccess: (data, id) => {
      // Invalidate and refetch conversations
      invalidateQueries.conversations.list();
    },
    onError: (error, id) => {
      // Revert optimistic update on error
      togglePin(id); // Toggle back

      setError(
        error instanceof Error
          ? error.message
          : "Failed to toggle conversation pin"
      );
    },
  });
};
