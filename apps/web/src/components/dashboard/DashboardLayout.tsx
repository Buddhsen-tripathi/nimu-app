"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, LayoutGrid, MoreHorizontal } from "lucide-react";
import Sidebar from "./Sidebar";
import ChatPane from "./ChatPane";
import GhostIconButton from "./GhostIconButton";
import ThemeToggle from "./ThemeToggle";
import { INITIAL_TEMPLATES, INITIAL_FOLDERS } from "./mockData";
import { Conversation, Template, Folder, CollapsedSections } from "./types";
import {
  useConversations,
  useCreateConversation,
} from "@/hooks/queries/useConversations";
import { useMessages, useSendMessage } from "@/hooks/queries/useMessages";

export default function DashboardLayout() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("light");

  // Use real API hooks instead of mock data
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useConversations();
  const createConversationMutation = useCreateConversation();
  const sendMessageMutation = useSendMessage();

  // Type assertion for conversations
  const typedConversations = conversations as any[];

  useEffect(() => {
    setMounted(true);

    // Initialize theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      setTheme("dark");
    }

    // Initialize collapsed state
    try {
      const raw = localStorage.getItem("sidebar-collapsed");
      if (raw) {
        setCollapsed(JSON.parse(raw));
      }
    } catch {}

    // Initialize sidebar collapsed state
    try {
      const saved = localStorage.getItem("sidebar-collapsed-state");
      if (saved) {
        setSidebarCollapsed(JSON.parse(saved));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (theme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.style.colorScheme = theme;
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      const media =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
      if (!media) return;
      const listener = (e: MediaQueryListEvent) => {
        const saved = localStorage.getItem("theme");
        if (!saved) setTheme(e.matches ? "dark" : "light");
      };
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    } catch {}
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<CollapsedSections>({
    pinned: true,
    recent: false,
    folders: true,
    templates: true,
  });
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        "sidebar-collapsed-state",
        JSON.stringify(sidebarCollapsed)
      );
    } catch {}
  }, [sidebarCollapsed]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);

  // Load messages for the selected conversation
  const { data: messages = [] } = useMessages(selectedId || "");

  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [isThinking, setIsThinking] = useState(false);
  const [thinkingConvId, setThinkingConvId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNewChat();
      }
      if (!e.metaKey && !e.ctrlKey && e.key === "/") {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, typedConversations]);

  useEffect(() => {
    if (!selectedId && typedConversations.length > 0) {
      createNewChat();
    }
  }, [typedConversations.length]);

  const filtered = useMemo(() => {
    if (!query.trim()) return typedConversations;
    const q = query.toLowerCase();
    return typedConversations.filter(
      (c: any) =>
        c.title?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
    );
  }, [typedConversations, query]);

  // For now, we'll show all conversations as recent since we don't have pinned functionality
  const pinned: Conversation[] = [];
  const recent = filtered
    .sort((a: Conversation, b: Conversation) =>
      new Date(a.updatedAt) < new Date(b.updatedAt) ? 1 : -1
    )
    .slice(0, 10);

  const folderCounts = React.useMemo(() => {
    const map = Object.fromEntries(folders.map((f) => [f.name, 0]));
    // For now, we don't have folder functionality in the database
    return map;
  }, [folders]);

  function togglePin(id: string) {
    // This will be handled by the API mutation
    // For now, we'll use the toggle pin mutation from the hooks
    console.log("Toggle pin for conversation:", id);
  }

  function createNewChat() {
    createConversationMutation.mutate(
      {
        userId: "current-user-id", // TODO: Get from auth session
        title: "New Generation",
        type: "video_generation",
        status: "active",
        isArchived: false,
        isDeleted: false,
        messageCount: 0,
      },
      {
        onSuccess: (newConversation) => {
          setSelectedId(newConversation.id);
          setSidebarOpen(false);
        },
        onError: (error) => {
          console.error("Failed to create conversation:", error);
          // You could add a toast notification here
        },
      }
    );
  }

  function createFolder() {
    const name = prompt("Folder name");
    if (!name) return;
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase()))
      return alert("Folder already exists.");
    setFolders((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), name },
    ]);
  }

  function sendMessage(convId: string, content: string) {
    if (!content.trim()) return;

    // Send the user message
    sendMessageMutation.mutate(
      {
        conversationId: convId,
        role: "user",
        type: "text",
        content: content.trim(),
      },
      {
        onSuccess: () => {
          // Show thinking state for assistant response
          setIsThinking(true);
          setThinkingConvId(convId);

          // TODO: Add assistant response via API
          // For now, just simulate thinking
          setTimeout(() => {
            setIsThinking(false);
            setThinkingConvId(null);
          }, 2000);
        },
        onError: (error) => {
          console.error("Failed to send message:", error);
          // You could add a toast notification here
        },
      }
    );
  }

  function editMessage(convId: string, messageId: string, newContent: string) {
    // TODO: Implement message editing via API
    console.log("Edit message:", { convId, messageId, newContent });
  }

  function resendMessage(convId: string, messageId: string) {
    // TODO: Implement message resending via API
    console.log("Resend message:", { convId, messageId });
  }

  function pauseThinking() {
    setIsThinking(false);
    setThinkingConvId(null);
  }

  function handleUseTemplate(template: Template) {
    // This will be passed down to the Composer component
    // The Composer will handle inserting the template content
    if (composerRef.current) {
      composerRef.current.insertTemplate(template.content);
    }
  }

  const composerRef = useRef<any>(null);

  const selected = typedConversations.find((c) => c.id === selectedId) || null;

  // Create a conversation object with messages for the ChatPane
  const selectedWithMessages = selected
    ? ({
        ...selected,
        messages: messages || [],
        preview: selected.title || "",
        pinned: false,
        folder: null,
      } as any)
    : null;

  if (!mounted || conversationsLoading) {
    return (
      <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-4"></div>
            <p className="text-sm text-zinc-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm text-red-500">
              Error loading conversations: {conversationsError.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-4 w-4 items-center justify-center">
            ✱
          </span>{" "}
          Nimu App
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GhostIconButton label="Schedule">
            <Calendar className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="Apps">
            <LayoutGrid className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="More">
            <MoreHorizontal className="h-4 w-4" />
          </GhostIconButton>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="flex h-[calc(100vh-0px)] w-full">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          setTheme={setTheme}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          conversations={typedConversations}
          pinned={pinned}
          recent={recent}
          folders={folders}
          folderCounts={folderCounts}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef as React.RefObject<HTMLInputElement>}
          createFolder={createFolder}
          createNewChat={createNewChat}
          templates={templates}
          setTemplates={setTemplates}
          onUseTemplate={handleUseTemplate}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <ChatPane
            ref={composerRef}
            conversation={selectedWithMessages}
            onSend={(content) => selected && sendMessage(selected.id, content)}
            onEditMessage={(messageId, newContent) =>
              selected && editMessage(selected.id, messageId, newContent)
            }
            onResendMessage={(messageId) =>
              selected && resendMessage(selected.id, messageId)
            }
            isThinking={isThinking && thinkingConvId === selected?.id}
            onPauseThinking={pauseThinking}
          />
        </main>
      </div>
    </div>
  );
}
