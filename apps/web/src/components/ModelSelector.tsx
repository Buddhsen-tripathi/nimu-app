"use client";

import { useState, useEffect } from "react";
import { Video } from "lucide-react";
import { cls } from "./dashboard/utils";

export interface VideoModel {
  id: string;
  name: string;
  provider: string;
  isAvailable: boolean;
}

interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

// Simplified model data
const AVAILABLE_MODELS: VideoModel[] = [
  {
    id: "veo-3.0-generate-001",
    name: "Veo 3.0",
    provider: "google",
    isAvailable: true,
  },
  {
    id: "veo-3.0-fast-generate-001",
    name: "Veo 3.0 Fast",
    provider: "google",
    isAvailable: true,
  },
  {
    id: "veo-2.0-generate-001",
    name: "Veo 2.0",
    provider: "google",
    isAvailable: true,
  },
];

const DEFAULT_MODEL_ID = "veo-3.0-generate-001";

function ModelSelector({
  selectedModel,
  onModelSelect,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<VideoModel[]>([]);

  useEffect(() => {
    // Set models and default
    setModels(AVAILABLE_MODELS.filter((model) => model.isAvailable));

    // Set default model if none selected
    if (!selectedModel && AVAILABLE_MODELS.length > 0) {
      const defaultModel =
        AVAILABLE_MODELS.find((m) => m.id === DEFAULT_MODEL_ID) ||
        AVAILABLE_MODELS[0];
      onModelSelect(defaultModel?.id || "");
    }
  }, [selectedModel, onModelSelect]);

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  const handleModelSelect = (modelId: string) => {
    onModelSelect(modelId);
    setIsOpen(false);
  };

  if (!currentModel) {
    return null;
  }

  return (
    <div className={cls("relative", className)}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cls(
          "inline-flex shrink-0 items-center justify-center rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title={`Model: ${currentModel.name}`}
      >
        <Video className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown - positioned above */}
          <div className="absolute bottom-full left-0 mb-1 w-48 z-20 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            <div className="p-1">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={cls(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    model.id === selectedModel &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
                    model.id !== selectedModel &&
                      "text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ModelSelector;
