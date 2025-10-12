import { useConversationStore } from "./useConversationStore";
import { useMessageStore } from "./useMessageStore";
import { useGenerationStore } from "./useGenerationStore";
import type { Conversation, Message, Generation } from "@/db/schema";

/**
 * Store integration utilities for connecting Zustand stores with React Query
 * This will be used in Phase 4 when we implement React Query hooks
 */

// Conversation store integration
export const conversationStoreIntegration = {
  // Optimistic updates for creating conversations
  optimisticCreateConversation: (conversation: Conversation) => {
    useConversationStore.getState().createConversation(conversation);
  },

  // Update conversations after successful API call
  updateConversations: (conversations: Conversation[]) => {
    useConversationStore.getState().loadConversations(conversations);
  },

  // Update single conversation after successful API call
  updateConversation: (id: string, data: Partial<Conversation>) => {
    useConversationStore.getState().updateConversation(id, data);
  },

  // Remove conversation after successful deletion
  removeConversation: (id: string) => {
    useConversationStore.getState().deleteConversation(id);
  },
};

// Message store integration
export const messageStoreIntegration = {
  // Optimistic updates for sending messages
  optimisticSendMessage: (
    conversationId: string,
    content: string,
    role: Message["role"]
  ) => {
    useMessageStore.getState().sendMessage(conversationId, content, role);
  },

  // Update messages after successful API call
  updateMessages: (conversationId: string, messages: Message[]) => {
    useMessageStore.getState().loadMessages(conversationId, messages);
  },

  // Add new message after successful API call
  addMessage: (conversationId: string, message: Message) => {
    const currentMessages = useMessageStore
      .getState()
      .getMessages(conversationId);
    useMessageStore
      .getState()
      .loadMessages(conversationId, [...currentMessages, message]);
  },

  // Update message after successful edit
  updateMessage: (
    conversationId: string,
    messageId: string,
    content: string
  ) => {
    useMessageStore.getState().editMessage(conversationId, messageId, content);
  },

  // Remove message after successful deletion
  removeMessage: (conversationId: string, messageId: string) => {
    useMessageStore.getState().deleteMessage(conversationId, messageId);
  },
};

// Generation store integration
export const generationStoreIntegration = {
  // Add generation after successful creation
  addGeneration: (generation: Generation) => {
    useGenerationStore.getState().requestGeneration(generation);
  },

  // Update generation after successful status update
  updateGeneration: (
    generationId: string,
    status: Generation["status"],
    additionalData?: Partial<Generation>
  ) => {
    useGenerationStore
      .getState()
      .updateGenerationStatus(generationId, status, additionalData);
  },

  // Update generation with clarification responses
  updateClarification: (generationId: string, clarificationResponses: any) => {
    useGenerationStore
      .getState()
      .submitClarification(generationId, clarificationResponses);
  },

  // Confirm generation after successful confirmation
  confirmGeneration: (generationId: string, bullmqJobId?: string) => {
    useGenerationStore.getState().confirmGeneration(generationId, bullmqJobId);
  },

  // Update generations for a conversation
  updateConversationGenerations: (
    conversationId: string,
    generations: Generation[]
  ) => {
    useGenerationStore.getState().generations[conversationId] = generations;
  },
};

// Error handling utilities
export const storeErrorHandling = {
  setConversationError: (error: string) => {
    useConversationStore.getState().setError(error);
  },

  setMessageError: (error: string) => {
    useMessageStore.getState().setError(error);
  },

  setGenerationError: (error: string) => {
    useGenerationStore.getState().setError(error);
  },

  clearAllErrors: () => {
    useConversationStore.getState().clearError();
    useMessageStore.getState().clearError();
    useGenerationStore.getState().clearError();
  },
};

// Loading state utilities
export const storeLoadingHandling = {
  setConversationLoading: (loading: boolean) => {
    useConversationStore.getState().setLoading(loading);
  },

  setMessageLoading: (loading: boolean) => {
    useMessageStore.getState().setLoading(loading);
  },

  setGenerationLoading: (loading: boolean) => {
    useGenerationStore.getState().setGenerating(loading);
  },
};

// Store synchronization utilities
export const storeSynchronization = {
  // Sync conversation updates with message store
  syncConversationUpdate: (
    conversationId: string,
    data: Partial<Conversation>
  ) => {
    // Update conversation in conversation store
    useConversationStore.getState().updateConversation(conversationId, data);

    // If conversation is deleted, clear messages
    if (data.status === "deleted" || data.isDeleted) {
      useMessageStore.getState().clearMessages(conversationId);
    }
  },

  // Sync message updates with conversation store
  syncMessageUpdate: (conversationId: string, message: Message) => {
    // Update last message time and count in conversation
    useConversationStore.getState().updateConversation(conversationId, {
      lastMessageAt: message.createdAt,
      messageCount: useMessageStore.getState().getMessages(conversationId)
        .length,
    });
  },

  // Sync generation updates with conversation store
  syncGenerationUpdate: (conversationId: string, generation: Generation) => {
    // Update conversation if generation affects its state
    if (generation.status === "completed") {
      // You might want to update conversation metadata here
      console.log("Generation completed for conversation:", conversationId);
    }
  },
};
