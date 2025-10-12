import {
  useConversations,
  useConversation,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation,
  useToggleConversationPin,
} from "./queries/useConversations";
import {
  useMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
} from "./queries/useMessages";
import {
  useGenerations,
  useGeneration,
  useRequestGeneration,
  useSubmitClarification,
  useConfirmGeneration,
  useUpdateGenerationStatus,
  usePollGeneration,
  useActiveGenerations,
  usePendingClarifications,
} from "./queries/useGenerations";
import { useJobStatus, usePollJobStatus } from "./queries/useJobs";
import { useConversationStore } from "@/stores/useConversationStore";
import { useMessageStore } from "@/stores/useMessageStore";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { useUIStore } from "@/stores/useUIStore";

/**
 * Comprehensive hook that combines React Query with Zustand stores
 * This provides a unified interface for data fetching and state management
 */
export const useAppQueries = () => {
  // Store selectors
  const conversations = useConversationStore();
  const messages = useMessageStore();
  const generations = useGenerationStore();
  const ui = useUIStore();

  return {
    // Store state
    stores: {
      conversations,
      messages,
      generations,
      ui,
    },

    // Conversation queries
    conversations: {
      // Queries
      useConversations,
      useConversation,

      // Mutations
      useCreateConversation,
      useUpdateConversation,
      useDeleteConversation,
      useToggleConversationPin,
    },

    // Message queries
    messages: {
      // Queries
      useMessages,

      // Mutations
      useSendMessage,
      useEditMessage,
      useDeleteMessage,
    },

    // Generation queries
    generations: {
      // Queries
      useGenerations,
      useGeneration,
      useActiveGenerations,
      usePendingClarifications,
      usePollGeneration,

      // Mutations
      useRequestGeneration,
      useSubmitClarification,
      useConfirmGeneration,
      useUpdateGenerationStatus,
    },

    // Job queries
    jobs: {
      useJobStatus,
      usePollJobStatus,
    },
  };
};

/**
 * Hook for conversation-specific operations
 */
export const useConversationQueries = (conversationId: string) => {
  const conversations = useConversationStore();
  const messages = useMessageStore();
  const generations = useGenerationStore();

  return {
    // Store state
    conversation: conversations.getConversationById(conversationId),
    conversationMessages: messages.getMessages(conversationId),
    conversationGenerations: generations.getGenerations(conversationId),

    // Loading states
    isLoadingConversation: conversations.isLoading,
    isLoadingMessages: messages.isLoading,
    isGenerating: generations.isGenerating,

    // Error states
    conversationError: conversations.error,
    messageError: messages.error,
    generationError: generations.error,

    // Actions
    selectConversation: conversations.selectConversation,
    setCurrentMessage: messages.setCurrentMessage,
    setTyping: messages.setTyping,

    // Query hooks
    queries: {
      useConversation: () => useConversation(conversationId),
      useMessages: () => useMessages(conversationId),
      useGenerations: () => useGenerations(conversationId),
    },
  };
};

/**
 * Hook for generation-specific operations
 */
export const useGenerationQueries = (generationId: string) => {
  const generations = useGenerationStore();

  return {
    // Store state
    generation: generations.getGenerationById(generationId),
    isGenerating: generations.isGenerating,
    error: generations.error,

    // Query hooks
    queries: {
      useGeneration: () => useGeneration(generationId),
      usePollGeneration: (enabled: boolean = true) =>
        usePollGeneration(generationId, enabled),
    },
  };
};

/**
 * Hook for real-time updates and polling
 */
export const useRealtimeQueries = () => {
  const generations = useGenerationStore();

  // Get active generations for polling
  const activeGenerations = generations.getActiveGenerations();
  const pendingClarifications = generations.getPendingClarifications();

  return {
    // Active generations that need polling
    activeGenerations,
    pendingClarifications,

    // Polling hooks for active generations
    useActiveGenerationPolling: () => {
      return activeGenerations.map((gen) => ({
        generation: gen,
        pollQuery: usePollGeneration(gen.id, true),
        jobPollQuery: gen.workerJobId
          ? usePollJobStatus(gen.workerJobId, true)
          : null,
      }));
    },
  };
};
