// Export all stores
export { useConversationStore } from "./useConversationStore";
export { useMessageStore } from "./useMessageStore";
export { useGenerationStore } from "./useGenerationStore";
export { useUIStore } from "./useUIStore";

// Combined store hook for convenience
import { useConversationStore } from "./useConversationStore";
import { useMessageStore } from "./useMessageStore";
import { useGenerationStore } from "./useGenerationStore";
import { useUIStore } from "./useUIStore";

export const useAppStore = () => {
  const conversations = useConversationStore();
  const messages = useMessageStore();
  const generations = useGenerationStore();
  const ui = useUIStore();

  return {
    conversations,
    messages,
    generations,
    ui,
  };
};

// Store selectors for performance optimization
export const useConversationSelector = <T>(
  selector: (state: ReturnType<typeof useConversationStore>) => T
) => useConversationStore(selector);

export const useMessageSelector = <T>(
  selector: (state: ReturnType<typeof useMessageStore>) => T
) => useMessageStore(selector);

export const useGenerationSelector = <T>(
  selector: (state: ReturnType<typeof useGenerationStore>) => T
) => useGenerationStore(selector);

export const useUISelector = <T>(
  selector: (state: ReturnType<typeof useUIStore>) => T
) => useUIStore(selector);
