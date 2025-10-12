import { QueryClient } from "@tanstack/react-query";

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time in milliseconds that data remains fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Time in milliseconds that unused/inactive cache data remains in memory
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Refetch on mount
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for mutations
        return failureCount < 2;
      },
      // Retry delay for mutations
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Conversation keys
  conversations: {
    all: ["conversations"] as const,
    lists: () => [...queryKeys.conversations.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.conversations.lists(), { filters }] as const,
    details: () => [...queryKeys.conversations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.conversations.details(), id] as const,
    messages: (id: string) =>
      [...queryKeys.conversations.detail(id), "messages"] as const,
    search: (query: string) =>
      [...queryKeys.conversations.all, "search", query] as const,
  },

  // Message keys
  messages: {
    all: ["messages"] as const,
    lists: () => [...queryKeys.messages.all, "list"] as const,
    list: (conversationId: string) =>
      [...queryKeys.messages.lists(), conversationId] as const,
    details: () => [...queryKeys.messages.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.messages.details(), id] as const,
    search: (conversationId: string, query: string) =>
      [...queryKeys.messages.all, "search", conversationId, query] as const,
  },

  // Generation keys
  generations: {
    all: ["generations"] as const,
    lists: () => [...queryKeys.generations.all, "list"] as const,
    list: (conversationId: string) =>
      [...queryKeys.generations.lists(), conversationId] as const,
    details: () => [...queryKeys.generations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.generations.details(), id] as const,
    active: () => [...queryKeys.generations.all, "active"] as const,
    pending: () => [...queryKeys.generations.all, "pending"] as const,
    queued: () => [...queryKeys.generations.all, "queued"] as const,
    completed: () => [...queryKeys.generations.all, "completed"] as const,
    failed: () => [...queryKeys.generations.all, "failed"] as const,
  },

  // Job keys
  jobs: {
    all: ["jobs"] as const,
    details: () => [...queryKeys.jobs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    status: (id: string) => [...queryKeys.jobs.detail(id), "status"] as const,
  },

  // User keys
  user: {
    all: ["user"] as const,
    profile: () => [...queryKeys.user.all, "profile"] as const,
    usage: () => [...queryKeys.user.all, "usage"] as const,
    quota: () => [...queryKeys.user.all, "quota"] as const,
  },
} as const;

// Utility function to invalidate related queries
export const invalidateQueries = {
  conversations: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all }),
    list: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.lists(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(id),
      }),
    messages: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(id),
      }),
  },
  messages: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all }),
    list: (conversationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(conversationId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.detail(id),
      }),
  },
  generations: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.generations.all }),
    list: (conversationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.generations.list(conversationId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.generations.detail(id),
      }),
    active: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.generations.active(),
      }),
    pending: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.generations.pending(),
      }),
  },
  jobs: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
    detail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) }),
  },
};
