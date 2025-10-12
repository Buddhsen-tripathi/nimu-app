import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGenerationById,
  confirmGeneration,
} from "@/lib/queries/generations";

// POST /api/generations/[id]/confirm - Confirm generation and start processing
export async function POST(
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

    // First, get the current generation to check its status
    const generation = await getGenerationById(params.id, session.user.id);

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    if (generation.status !== "pending_confirmation") {
      return NextResponse.json(
        { error: "Generation is not ready for confirmation" },
        { status: 400 }
      );
    }

    // Validate that required fields are present
    if (!generation.clarificationResponses) {
      return NextResponse.json(
        { error: "Clarification responses are required before confirmation" },
        { status: 400 }
      );
    }

    // Generate a BullMQ job ID (in a real implementation, this would come from the queue)
    const bullmqJobId = `job_${crypto.randomUUID()}`;

    // Confirm the generation and update status to "queued"
    const confirmedGeneration = await confirmGeneration(
      params.id,
      session.user.id,
      bullmqJobId
    );

    if (!confirmedGeneration) {
      return NextResponse.json(
        { error: "Failed to confirm generation" },
        { status: 500 }
      );
    }

    // TODO: In a real implementation, you would:
    // 1. Add the job to the BullMQ queue here
    // 2. The worker would pick up the job and start processing
    // 3. Update the generation status to "processing" when the worker starts

    return NextResponse.json({
      generation: confirmedGeneration,
      jobId: bullmqJobId,
      message: "Generation confirmed and queued for processing",
      status: "queued",
    });
  } catch (error) {
    console.error("Error confirming generation:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Generation not found" },
          { status: 404 }
        );
      }
      if (error.message.includes("access denied")) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
