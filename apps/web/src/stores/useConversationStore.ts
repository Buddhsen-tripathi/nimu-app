import { create } from "zustand";
import { persist } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import type { Conversation } from "@/db/schema";

interface ConversationStore {
  // State
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filteredConversations: Conversation[];

  // Actions
  loadConversations: (conversations: Conversation[]) => void;
  selectConversation: (id: string) => void;
  createConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  togglePin: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Computed getters
  getPinnedConversations: () => Conversation[];
  getRecentConversations: () => Conversation[];
  getConversationById: (id: string) => Conversation | null;
}

export const useConversationStore = create<ConversationStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        conversations: [],
        selectedConversation: null,
        isLoading: false,
        error: null,
        searchQuery: "",
        filteredConversations: [],

        // Actions
        loadConversations: (conversations) => {
          set((state) => {
            const filtered = state.searchQuery
              ? conversations.filter(
                  (conv) =>
                    conv.title
                      ?.toLowerCase()
                      .includes(state.searchQuery.toLowerCase()) ||
                    conv.id
                      .toLowerCase()
                      .includes(state.searchQuery.toLowerCase())
                )
              : conversations;

            return {
              conversations,
              filteredConversations: filtered,
              isLoading: false,
              error: null,
            };
          });
        },

        selectConversation: (id) => {
          set((state) => {
            const conversation = state.conversations.find(
              (conv) => conv.id === id
            );
            return {
              selectedConversation: conversation || null,
            };
          });
        },

        createConversation: (conversation) => {
          set((state) => {
            const updatedConversations = [conversation, ...state.conversations];
            const filtered = state.searchQuery
              ? updatedConversations.filter(
                  (conv) =>
                    conv.title
                      ?.toLowerCase()
                      .includes(state.searchQuery.toLowerCase()) ||
                    conv.id
                      .toLowerCase()
                      .includes(state.searchQuery.toLowerCase())
                )
              : updatedConversations;

            return {
              conversations: updatedConversations,
              filteredConversations: filtered,
              selectedConversation: conversation,
            };
          });
        },

        updateConversation: (id, data) => {
          set((state) => {
            const updatedConversations = state.conversations.map((conv) =>
              conv.id === id
                ? { ...conv, ...data, updatedAt: new Date() }
                : conv
            );

            const updatedFiltered = state.filteredConversations.map((conv) =>
              conv.id === id
                ? { ...conv, ...data, updatedAt: new Date() }
                : conv
            );

            const updatedSelected =
              state.selectedConversation?.id === id
                ? {
                    ...state.selectedConversation,
                    ...data,
                    updatedAt: new Date(),
                  }
                : state.selectedConversation;

            return {
              conversations: updatedConversations,
              filteredConversations: updatedFiltered,
              selectedConversation: updatedSelected,
            };
          });
        },

        deleteConversation: (id) => {
          set((state) => {
            const updatedConversations = state.conversations.filter(
              (conv) => conv.id !== id
            );
            const updatedFiltered = state.filteredConversations.filter(
              (conv) => conv.id !== id
            );

            const newSelected =
              state.selectedConversation?.id === id
                ? null
                : state.selectedConversation;

            return {
              conversations: updatedConversations,
              filteredConversations: updatedFiltered,
              selectedConversation: newSelected,
            };
          });
        },

        togglePin: (id) => {
          set((state) => {
            // Since we don't have a pinned field in the database schema,
            // we'll use the archived status as a proxy for pinned
            const updatedConversations = state.conversations.map((conv) =>
              conv.id === id
                ? {
                    ...conv,
                    isArchived: !conv.isArchived,
                    status: conv.isArchived ? "active" : "archived",
                    updatedAt: new Date(),
                  }
                : conv
            );

            const updatedFiltered = state.filteredConversations.map((conv) =>
              conv.id === id
                ? {
                    ...conv,
                    isArchived: !conv.isArchived,
                    status: conv.isArchived ? "active" : "archived",
                    updatedAt: new Date(),
                  }
                : conv
            );

            const updatedSelected =
              state.selectedConversation?.id === id
                ? {
                    ...state.selectedConversation,
                    isArchived: !state.selectedConversation.isArchived,
                    status: state.selectedConversation.isArchived
                      ? "active"
                      : "archived",
                    updatedAt: new Date(),
                  }
                : state.selectedConversation;

            return {
              conversations: updatedConversations,
              filteredConversations: updatedFiltered,
              selectedConversation: updatedSelected,
            };
          });
        },

        setSearchQuery: (query) => {
          set((state) => {
            const filtered = query
              ? state.conversations.filter(
                  (conv) =>
                    conv.title?.toLowerCase().includes(query.toLowerCase()) ||
                    conv.id.toLowerCase().includes(query.toLowerCase())
                )
              : state.conversations;

            return {
              searchQuery: query,
              filteredConversations: filtered,
            };
          });
        },

        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // Computed getters
        getPinnedConversations: () => {
          const state = get();
          return state.conversations.filter((conv) => conv.isArchived);
        },

        getRecentConversations: () => {
          const state = get();
          return state.conversations
            .filter((conv) => !conv.isArchived)
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
            );
        },

        getConversationById: (id) => {
          const state = get();
          return state.conversations.find((conv) => conv.id === id) || null;
        },
      }),
      {
        name: "conversation-store",
        partialize: (state) => ({
          selectedConversation: state.selectedConversation,
          searchQuery: state.searchQuery,
        }),
      }
    ),
    {
      name: "conversation-store",
    }
  )
);
