export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  editedAt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
  pinned: boolean;
  folder: string | null;
  messages: Message[];
}

export interface Template {
  id: string;
  name: string;
  content: string;
  snippet: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface CollapsedSections {
  pinned: boolean;
  recent: boolean;
  folders: boolean;
  templates: boolean;
}

export interface DashboardLayoutProps {
  theme: string;
  setTheme: (theme: string) => void;
}

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  collapsed: CollapsedSections;
  setCollapsed: (collapsed: CollapsedSections) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  conversations: Conversation[];
  pinned: Conversation[];
  recent: Conversation[];
  folders: Folder[];
  folderCounts: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  togglePin: (id: string) => void;
  query: string;
  setQuery: (query: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  createFolder: (name: string) => void;
  createNewChat: () => void;
  templates?: Template[];
  setTemplates?: (templates: Template[]) => void;
  onUseTemplate?: (template: Template) => void;
}

export interface ChatPaneProps {
  conversation: Conversation | null;
  onSend: (content: string, options?: { selectedModel?: string }) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onResendMessage: (messageId: string) => void;
  isThinking: boolean;
  onPauseThinking: () => void;
}

export interface ConversationRowProps {
  data: Conversation;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  showMeta?: boolean;
}

export interface FolderRowProps {
  name: string;
  count: number;
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  togglePin: (id: string) => void;
  onDeleteFolder: (name: string) => void;
  onRenameFolder: (oldName: string, newName: string) => void;
}

export interface TemplateRowProps {
  template: Template;
  onUseTemplate: (template: Template) => void;
  onEditTemplate: (template: Template) => void;
  onRenameTemplate: (templateId: string, newName: string) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export interface SidebarSectionProps {
  icon: React.ReactNode;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export interface MessageProps {
  role: "user" | "assistant";
  children: React.ReactNode;
}

export interface ComposerProps {
  onSend: (text: string, options?: { selectedModel?: string }) => Promise<void>;
  busy: boolean;
}

export interface ComposerActionsPopoverProps {
  children: React.ReactNode;
}

export interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string) => void;
}

export interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTemplate: (template: Omit<Template, "id">) => void;
  editingTemplate?: Template | null;
}

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  togglePin: (id: string) => void;
  createNewChat: () => void;
}

export interface SettingsPopoverProps {
  children: React.ReactNode;
}

export interface GhostIconButtonProps {
  label: string;
  children: React.ReactNode;
}

export interface ThemeToggleProps {
  theme: string;
  setTheme: (theme: string) => void;
}
