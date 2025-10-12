import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { useGenerationStore } from "@/stores/useGenerationStore";

// API functions
const jobsApi = {
  getJobStatus: async (jobId: string) => {
    const response = await fetch(`/api/queue/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch job status");
    }
    return response.json();
  },
};

// Query hooks
export const useJobStatus = (jobId: string, enabled: boolean = true) => {
  const { updateGenerationStatus, setError } = useGenerationStore();

  return useQuery({
    queryKey: queryKeys.jobs.status(jobId),
    queryFn: () => jobsApi.getJobStatus(jobId),
    enabled: enabled && !!jobId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if job is active
      const isActive =
        data?.job?.status && ["queued", "processing"].includes(data.job.status);
      return isActive ? 2000 : false;
    },
    onSuccess: (data) => {
      // Update generation status based on job status
      if (data?.job) {
        const { generationId, status, progress } = data.job;
        if (generationId) {
          updateGenerationStatus(generationId, status, {
            queuePosition: data.status?.queuePosition,
            processingTime: data.status?.processingTime,
          });
        }
      }
    },
    onError: (error) => {
      setError(
        error instanceof Error ? error.message : "Failed to fetch job status"
      );
    },
  });
};

export const usePollJobStatus = (jobId: string, enabled: boolean = true) => {
  return useJobStatus(jobId, enabled);
};
