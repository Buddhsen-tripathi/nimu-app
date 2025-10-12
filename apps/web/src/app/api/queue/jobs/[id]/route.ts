import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGenerationJobByJobId } from "@/lib/queries/generations";

// GET /api/queue/jobs/[id] - Get job status from BullMQ
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the generation job by job ID
    const job = await getGenerationJobByJobId(params.id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // TODO: In a real implementation, you would also query BullMQ directly
    // to get the latest job status, progress, and any errors
    // For now, we'll return the database record

    // Mock BullMQ job data (replace with actual BullMQ query)
    const mockBullMQData = {
      id: params.id,
      name: "video-generation",
      data: {
        generationId: job.generationId,
        userId: session.user.id,
      },
      progress: job.progress || 0,
      delay: 0,
      timestamp: job.createdAt.getTime(),
      attemptsMade: job.retryCount,
      processedOn: job.status === "processing" ? Date.now() : null,
      finishedOn: job.status === "completed" ? Date.now() : null,
      failedReason: job.errorMessage,
    };

    // Calculate estimated time remaining based on progress
    const estimatedTimeRemaining = job.progress
      ? Math.max(0, (100 - job.progress) * 2) // Rough estimate: 2 seconds per percent
      : null;

    const response = {
      job: {
        ...job,
        bullmqData: mockBullMQData,
      },
      status: {
        isActive: ["queued", "processing"].includes(job.status),
        isCompleted: job.status === "completed",
        isFailed: job.status === "failed",
        canRetry: job.status === "failed" && job.retryCount < job.maxRetries,
        progress: job.progress || 0,
        estimatedTimeRemaining,
        queuePosition: null, // Would be fetched from BullMQ
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
