"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Globe,
  HelpCircle,
  Crown,
  BookOpen,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { SettingsPopoverProps } from "./types";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import PersonalSettingsModal from "./PersonalSettingsModal";

export default function SettingsPopover({ children }: SettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            router.push("/");
          },
        },
      });
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const handlePersonalClick = () => {
    setOpen(false);
    setPersonalModalOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start" side="top">
          <div className="p-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              {isPending ? "Loading..." : session?.user?.email || "No email"}
            </div>

            <button
              onClick={handlePersonalClick}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 mb-4 w-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Personal</span>
              </div>
              <div className="ml-auto">
                <div className="text-xs text-zinc-500">Free plan</div>
              </div>
              <div className="text-primary">
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>

            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Settings
              </div>

              <button className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <Globe className="h-4 w-4" />
                <span>Language</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </button>

              <button className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <HelpCircle className="h-4 w-4" />
                <span>Get help</span>
              </button>

              <button className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <Crown className="h-4 w-4" />
                <span>Upgrade plan</span>
              </button>

              <button className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <BookOpen className="h-4 w-4" />
                <span>Learn more</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <PersonalSettingsModal
        open={personalModalOpen}
        onOpenChange={setPersonalModalOpen}
      />
    </>
  );
}
