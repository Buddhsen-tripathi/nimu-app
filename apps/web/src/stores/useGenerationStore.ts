import { create } from "zustand";
import { persist } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import type { Generation } from "@/db/schema";

interface GenerationStore {
  // State
  generations: Record<string, Generation[]>; // conversationId -> generations
  activeGenerations: Generation[];
  isGenerating: boolean;
  pendingClarifications: Generation[];
  error: string | null;

  // Actions
  requestGeneration: (generation: Generation) => void;
  submitClarification: (
    generationId: string,
    clarificationResponses: any
  ) => void;
  confirmGeneration: (generationId: string, workerJobId?: string) => void;
  updateGenerationStatus: (
    generationId: string,
    status: Generation["status"],
    additionalData?: Partial<Generation>
  ) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Polling actions
  pollGeneration: (generationId: string) => void;
  pollJobStatus: (jobId: string) => void;

  // Computed getters
  getGenerations: (conversationId: string) => Generation[];
  getGenerationById: (generationId: string) => Generation | null;
  getActiveGenerations: () => Generation[];
  getPendingClarifications: () => Generation[];
  getQueuedGenerations: () => Generation[];
  getCompletedGenerations: () => Generation[];
  getFailedGenerations: () => Generation[];
}

export const useGenerationStore = create<GenerationStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        generations: {},
        activeGenerations: [],
        isGenerating: false,
        pendingClarifications: [],
        error: null,

        // Actions
        requestGeneration: (generation) => {
          set((state) => {
            const conversationGenerations =
              state.generations[generation.conversationId] || [];
            const updatedGenerations = {
              ...state.generations,
              [generation.conversationId]: [
                ...conversationGenerations,
                generation,
              ],
            };

            const updatedPendingClarifications =
              generation.status === "pending_clarification"
                ? [...state.pendingClarifications, generation]
                : state.pendingClarifications;

            return {
              generations: updatedGenerations,
              pendingClarifications: updatedPendingClarifications,
              isGenerating: true,
            };
          });
        },

        submitClarification: (generationId, clarificationResponses) => {
          set((state) => {
            const updatedGenerations = { ...state.generations };
            const updatedPendingClarifications =
              state.pendingClarifications.filter(
                (gen) => gen.id !== generationId
              );

            // Update the generation in all conversations
            Object.keys(updatedGenerations).forEach((conversationId) => {
              updatedGenerations[conversationId] =
                updatedGenerations[conversationId]?.map((gen) =>
                  gen.id === generationId
                    ? {
                        ...gen,
                        clarificationResponses,
                        status: "pending_confirmation" as const,
                        updatedAt: new Date(),
                      }
                    : gen
                ) || [];
            });

            // Update active generations if it exists there
            const updatedActiveGenerations = state.activeGenerations.map(
              (gen) =>
                gen.id === generationId
                  ? {
                      ...gen,
                      clarificationResponses,
                      status: "pending_confirmation" as const,
                      updatedAt: new Date(),
                    }
                  : gen
            );

            return {
              generations: updatedGenerations,
              pendingClarifications: updatedPendingClarifications,
              activeGenerations: updatedActiveGenerations,
            };
          });
        },

        confirmGeneration: (generationId, workerJobId) => {
          set((state) => {
            const updatedGenerations = { ...state.generations };

            // Update the generation in all conversations
            Object.keys(updatedGenerations).forEach((conversationId) => {
              updatedGenerations[conversationId] =
                updatedGenerations[conversationId]?.map((gen) =>
                  gen.id === generationId
                    ? {
                        ...gen,
                        status: "queued" as const,
                        workerJobId: workerJobId || null,
                        updatedAt: new Date(),
                      }
                    : gen
                ) || [];
            });

            // Update active generations if it exists there
            const updatedActiveGenerations = state.activeGenerations.map(
              (gen) =>
                gen.id === generationId
                  ? {
                      ...gen,
                      status: "queued" as const,
                      workerJobId: workerJobId || null,
                      updatedAt: new Date(),
                    }
                  : gen
            );

            return {
              generations: updatedGenerations,
              activeGenerations: updatedActiveGenerations,
            };
          });
        },

        updateGenerationStatus: (generationId, status, additionalData = {}) => {
          set((state) => {
            const updatedGenerations = { ...state.generations };

            // Update the generation in all conversations
            Object.keys(updatedGenerations).forEach((conversationId) => {
              updatedGenerations[conversationId] =
                updatedGenerations[conversationId]?.map((gen) =>
                  gen.id === generationId
                    ? {
                        ...gen,
                        status,
                        ...additionalData,
                        updatedAt: new Date(),
                      }
                    : gen
                ) || [];
            });

            // Update active generations
            const updatedActiveGenerations = state.activeGenerations.map(
              (gen) =>
                gen.id === generationId
                  ? {
                      ...gen,
                      status,
                      ...additionalData,
                      updatedAt: new Date(),
                    }
                  : gen
            );

            // Remove from active generations if completed or failed
            const finalActiveGenerations =
              status === "completed" || status === "failed"
                ? updatedActiveGenerations.filter(
                    (gen) => gen.id !== generationId
                  )
                : updatedActiveGenerations;

            return {
              generations: updatedGenerations,
              activeGenerations: finalActiveGenerations,
              isGenerating: finalActiveGenerations.some((gen) =>
                ["queued", "processing"].includes(gen.status)
              ),
            };
          });
        },

        setGenerating: (generating) => set({ isGenerating: generating }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // Polling actions (these would integrate with React Query in Phase 4)
        pollGeneration: (generationId) => {
          // This will be implemented with React Query polling
          console.log("Polling generation:", generationId);
        },

        pollJobStatus: (jobId) => {
          // This will be implemented with React Query polling
          console.log("Polling job status:", jobId);
        },

        // Computed getters
        getGenerations: (conversationId) => {
          const state = get();
          return state.generations[conversationId] || [];
        },

        getGenerationById: (generationId) => {
          const state = get();
          for (const conversationId in state.generations) {
            const generation = state.generations[conversationId]?.find(
              (gen) => gen.id === generationId
            );
            if (generation) return generation;
          }
          return null;
        },

        getActiveGenerations: () => {
          const state = get();
          return state.activeGenerations.filter((gen) =>
            ["queued", "processing"].includes(gen.status)
          );
        },

        getPendingClarifications: () => {
          const state = get();
          return state.pendingClarifications.filter(
            (gen) => gen.status === "pending_clarification"
          );
        },

        getQueuedGenerations: () => {
          const state = get();
          return state.activeGenerations.filter(
            (gen) => gen.status === "queued"
          );
        },

        getCompletedGenerations: () => {
          const state = get();
          const allGenerations: Generation[] = [];
          Object.values(state.generations).forEach((conversations) => {
            allGenerations.push(...conversations);
          });
          return allGenerations.filter((gen) => gen.status === "completed");
        },

        getFailedGenerations: () => {
          const state = get();
          const allGenerations: Generation[] = [];
          Object.values(state.generations).forEach((conversations) => {
            allGenerations.push(...conversations);
          });
          return allGenerations.filter((gen) => gen.status === "failed");
        },
      }),
      {
        name: "generation-store",
        // Don't persist active generations as they should be refetched
        partialize: (state) => ({
          generations: state.generations,
        }),
      }
    ),
    {
      name: "generation-store",
    }
  )
);
