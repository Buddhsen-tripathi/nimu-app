import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateQueries } from "@/lib/react-query";
import { useMessageStore } from "@/stores/useMessageStore";
import { storeIntegration } from "@/stores/storeIntegration";
import type { Message, NewMessage } from "@/db/schema";

// API functions
const messagesApi = {
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await fetch(
      `/api/conversations/${conversationId}/messages`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch messages");
    }
    const data = await response.json();
    return data.messages;
  },

  getMessage: async (id: string): Promise<Message> => {
    const response = await fetch(`/api/messages/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch message");
    }
    return response.json();
  },

  createMessage: async (
    data: Omit<NewMessage, "id" | "createdAt" | "updatedAt">
  ): Promise<Message> => {
    const response = await fetch(
      `/api/conversations/${data.conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to create message");
    }
    return response.json();
  },

  updateMessage: async (id: string, content: string): Promise<Message> => {
    const response = await fetch(`/api/messages/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error("Failed to update message");
    }
    return response.json();
  },

  deleteMessage: async (id: string): Promise<void> => {
    const response = await fetch(`/api/messages/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete message");
    }
  },

  searchMessages: async (
    conversationId: string,
    query: string
  ): Promise<Message[]> => {
    const response = await fetch(
      `/api/conversations/${conversationId}/messages?query=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error("Failed to search messages");
    }
    const data = await response.json();
    return data.messages;
  },
};

// Query hooks
export const useMessages = (conversationId: string) => {
  const { loadMessages, setLoading, setError } = useMessageStore();

  return useQuery({
    queryKey: queryKeys.messages.list(conversationId),
    queryFn: () => messagesApi.getMessages(conversationId),
    enabled: !!conversationId,
    onSuccess: (data) => {
      loadMessages(conversationId, data);
    },
    onError: (error) => {
      setError(
        error instanceof Error ? error.message : "Failed to fetch messages"
      );
    },
    onSettled: () => {
      setLoading(false);
    },
  });
};

export const useMessage = (id: string) => {
  const { setError } = useMessageStore();

  return useQuery({
    queryKey: queryKeys.messages.detail(id),
    queryFn: () => messagesApi.getMessage(id),
    enabled: !!id,
    onError: (error) => {
      setError(
        error instanceof Error ? error.message : "Failed to fetch message"
      );
    },
  });
};

export const useSearchMessages = (conversationId: string, query: string) => {
  const { setError } = useMessageStore();

  return useQuery({
    queryKey: queryKeys.messages.search(conversationId, query),
    queryFn: () => messagesApi.searchMessages(conversationId, query),
    enabled: !!conversationId && !!query && query.length > 0,
    onError: (error) => {
      setError(
        error instanceof Error ? error.message : "Failed to search messages"
      );
    },
  });
};

// Mutation hooks
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { sendMessage, setError } = useMessageStore();

  return useMutation({
    mutationFn: messagesApi.createMessage,
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages.list(newMessage.conversationId),
      });

      // Optimistically add to store
      sendMessage(
        newMessage.conversationId,
        newMessage.content,
        newMessage.role
      );

      return { newMessage };
    },
    onSuccess: (data, variables) => {
      // Update the store with the actual data from the server
      const { loadMessages, getMessages } = useMessageStore.getState();
      const currentMessages = getMessages(variables.conversationId);
      loadMessages(variables.conversationId, [...currentMessages, data]);

      // Invalidate and refetch messages
      invalidateQueries.messages.list(variables.conversationId);
      invalidateQueries.conversations.detail(variables.conversationId);
    },
    onError: (error, variables) => {
      // Revert optimistic update on error
      const { deleteMessage, getMessages } = useMessageStore.getState();
      const messages = getMessages(variables.conversationId);
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.content === variables.content) {
        deleteMessage(variables.conversationId, lastMessage.id);
      }

      setError(
        error instanceof Error ? error.message : "Failed to send message"
      );
    },
  });
};

export const useEditMessage = () => {
  const queryClient = useQueryClient();
  const { editMessage, setError } = useMessageStore();

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      messagesApi.updateMessage(id, content),
    onMutate: async ({ id, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages.detail(id),
      });

      // Optimistically update in store
      // We need to find the conversation ID first
      const { getMessages } = useMessageStore.getState();
      let conversationId = "";
      for (const [convId, messages] of Object.entries(
        useMessageStore.getState().messages
      )) {
        if (messages.some((msg) => msg.id === id)) {
          conversationId = convId;
          break;
        }
      }

      if (conversationId) {
        editMessage(conversationId, id, content);
      }

      return { id, content, conversationId };
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      invalidateQueries.messages.detail(variables.id);
      if (variables.conversationId) {
        invalidateQueries.messages.list(variables.conversationId);
      }
    },
    onError: (error, variables) => {
      setError(
        error instanceof Error ? error.message : "Failed to edit message"
      );
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  const { deleteMessage, setError } = useMessageStore();

  return useMutation({
    mutationFn: messagesApi.deleteMessage,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages.detail(id),
      });

      // Find conversation ID and optimistically remove from store
      const { getMessages } = useMessageStore.getState();
      let conversationId = "";
      for (const [convId, messages] of Object.entries(
        useMessageStore.getState().messages
      )) {
        if (messages.some((msg) => msg.id === id)) {
          conversationId = convId;
          break;
        }
      }

      if (conversationId) {
        deleteMessage(conversationId, id);
      }

      return { id, conversationId };
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      invalidateQueries.messages.detail(variables.id);
      if (variables.conversationId) {
        invalidateQueries.messages.list(variables.conversationId);
        invalidateQueries.conversations.detail(variables.conversationId);
      }
    },
    onError: (error, variables) => {
      // Revert optimistic update on error
      console.error("Failed to delete message, reverting optimistic update");

      setError(
        error instanceof Error ? error.message : "Failed to delete message"
      );
    },
  });
};
