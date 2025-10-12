import { create } from "zustand";
import { persist } from "zustand/middleware";
import { devtools } from "zustand/middleware";

interface UIStore {
  // Sidebar state
  sidebarCollapsed: boolean;

  // Theme state
  theme: "light" | "dark" | "system";

  // Search state
  searchQuery: string;
  isSearchOpen: boolean;

  // Modal states
  isCreateFolderModalOpen: boolean;
  isCreateTemplateModalOpen: boolean;
  isSearchModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isPersonalSettingsModalOpen: boolean;

  // Collapsed sections state
  collapsedSections: {
    pinned: boolean;
    recent: boolean;
    folders: boolean;
    templates: boolean;
  };

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;

  // Modal actions
  openCreateFolderModal: () => void;
  closeCreateFolderModal: () => void;
  openCreateTemplateModal: () => void;
  closeCreateTemplateModal: () => void;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openPersonalSettingsModal: () => void;
  closePersonalSettingsModal: () => void;

  // Collapsed sections actions
  toggleCollapsedSection: (section: keyof UIStore["collapsedSections"]) => void;
  setCollapsedSection: (
    section: keyof UIStore["collapsedSections"],
    collapsed: boolean
  ) => void;
  setCollapsedSections: (
    sections: Partial<UIStore["collapsedSections"]>
  ) => void;

  // Utility actions
  resetUI: () => void;
}

const initialState = {
  sidebarCollapsed: false,
  theme: "system" as const,
  searchQuery: "",
  isSearchOpen: false,
  isCreateFolderModalOpen: false,
  isCreateTemplateModalOpen: false,
  isSearchModalOpen: false,
  isSettingsModalOpen: false,
  isPersonalSettingsModalOpen: false,
  collapsedSections: {
    pinned: false,
    recent: false,
    folders: false,
    templates: false,
  },
};

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Sidebar actions
        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }),

        // Theme actions
        setTheme: (theme) => set({ theme }),

        // Search actions
        setSearchQuery: (query) => set({ searchQuery: query }),
        setSearchOpen: (open) => set({ isSearchOpen: open }),

        // Modal actions
        openCreateFolderModal: () => set({ isCreateFolderModalOpen: true }),
        closeCreateFolderModal: () => set({ isCreateFolderModalOpen: false }),

        openCreateTemplateModal: () => set({ isCreateTemplateModalOpen: true }),
        closeCreateTemplateModal: () =>
          set({ isCreateTemplateModalOpen: false }),

        openSearchModal: () => set({ isSearchModalOpen: true }),
        closeSearchModal: () => set({ isSearchModalOpen: false }),

        openSettingsModal: () => set({ isSettingsModalOpen: true }),
        closeSettingsModal: () => set({ isSettingsModalOpen: false }),

        openPersonalSettingsModal: () =>
          set({ isPersonalSettingsModalOpen: true }),
        closePersonalSettingsModal: () =>
          set({ isPersonalSettingsModalOpen: false }),

        // Collapsed sections actions
        toggleCollapsedSection: (section) => {
          set((state) => ({
            collapsedSections: {
              ...state.collapsedSections,
              [section]: !state.collapsedSections[section],
            },
          }));
        },

        setCollapsedSection: (section, collapsed) => {
          set((state) => ({
            collapsedSections: {
              ...state.collapsedSections,
              [section]: collapsed,
            },
          }));
        },

        setCollapsedSections: (sections) => {
          set((state) => ({
            collapsedSections: {
              ...state.collapsedSections,
              ...sections,
            },
          }));
        },

        // Utility actions
        resetUI: () => set(initialState),
      }),
      {
        name: "ui-store",
        // Persist UI preferences but not modal states
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
          collapsedSections: state.collapsedSections,
        }),
      }
    ),
    {
      name: "ui-store",
    }
  )
);
