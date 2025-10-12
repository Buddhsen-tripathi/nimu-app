import { create } from "zustand";
import { persist } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import type { Message } from "@/db/schema";

interface MessageStore {
  // State
  messages: Record<string, Message[]>; // conversationId -> messages
  isTyping: boolean;
  currentMessage: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadMessages: (conversationId: string, messages: Message[]) => void;
  sendMessage: (
    conversationId: string,
    content: string,
    role: Message["role"]
  ) => void;
  editMessage: (
    conversationId: string,
    messageId: string,
    content: string
  ) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  setTyping: (typing: boolean) => void;
  setCurrentMessage: (message: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearMessages: (conversationId: string) => void;

  // Computed getters
  getMessages: (conversationId: string) => Message[];
  getLastMessage: (conversationId: string) => Message | null;
  getMessageById: (conversationId: string, messageId: string) => Message | null;
}

export const useMessageStore = create<MessageStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        messages: {},
        isTyping: false,
        currentMessage: "",
        isLoading: false,
        error: null,

        // Actions
        loadMessages: (conversationId, messages) => {
          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: messages,
            },
            isLoading: false,
            error: null,
          }));
        },

        sendMessage: (conversationId, content, role) => {
          const newMessage: Message = {
            id: crypto.randomUUID(),
            conversationId,
            role,
            type: "text",
            content,
            metadata: null,
            isEdited: false,
            editedAt: null,
            parentMessageId: null,
            tokenCount: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => {
            const existingMessages = state.messages[conversationId] || [];
            return {
              messages: {
                ...state.messages,
                [conversationId]: [...existingMessages, newMessage],
              },
              currentMessage: "",
            };
          });
        },

        editMessage: (conversationId, messageId, content) => {
          set((state) => {
            const conversationMessages = state.messages[conversationId] || [];
            const updatedMessages = conversationMessages.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content,
                    isEdited: true,
                    editedAt: new Date(),
                    updatedAt: new Date(),
                  }
                : msg
            );

            return {
              messages: {
                ...state.messages,
                [conversationId]: updatedMessages,
              },
            };
          });
        },

        deleteMessage: (conversationId, messageId) => {
          set((state) => {
            const conversationMessages = state.messages[conversationId] || [];
            const updatedMessages = conversationMessages.filter(
              (msg) => msg.id !== messageId
            );

            return {
              messages: {
                ...state.messages,
                [conversationId]: updatedMessages,
              },
            };
          });
        },

        setTyping: (typing) => set({ isTyping: typing }),
        setCurrentMessage: (message) => set({ currentMessage: message }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        clearMessages: (conversationId) => {
          set((state) => {
            const { [conversationId]: _, ...remainingMessages } =
              state.messages;
            return {
              messages: remainingMessages,
            };
          });
        },

        // Computed getters
        getMessages: (conversationId) => {
          const state = get();
          return state.messages[conversationId] || [];
        },

        getLastMessage: (conversationId) => {
          const state = get();
          const messages = state.messages[conversationId] || [];
          return messages.length > 0 ? messages[messages.length - 1] : null;
        },

        getMessageById: (conversationId, messageId) => {
          const state = get();
          const messages = state.messages[conversationId] || [];
          return messages.find((msg) => msg.id === messageId) || null;
        },
      }),
      {
        name: "message-store",
        partialize: (state) => ({
          currentMessage: state.currentMessage,
        }),
      }
    ),
    {
      name: "message-store",
    }
  )
);
