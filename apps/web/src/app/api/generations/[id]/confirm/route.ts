import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGenerationById,
  confirmGeneration,
} from "@/lib/queries/generations";
import { createWorkerClient } from "@/lib/cloudflare";

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

    // Send confirmation to Cloudflare Worker
    const workerClient = createWorkerClient();

    // Use the worker generation ID if available, otherwise use the database ID
    const workerGenerationId =
      (generation as any).workerGenerationId || params.id;

    const workerResponse =
      await workerClient.confirmGeneration(workerGenerationId);

    if (!workerResponse.success) {
      console.error("Worker confirmation failed:", workerResponse.error);
      return NextResponse.json(
        { error: "Failed to confirm generation with worker" },
        { status: 500 }
      );
    }

    // Generate a worker job ID
    const workerJobId =
      workerResponse.data?.operationId || `worker_${crypto.randomUUID()}`;

    // Confirm the generation and update status to "queued"
    const confirmedGeneration = await confirmGeneration(
      params.id,
      session.user.id,
      workerJobId
    );

    if (!confirmedGeneration) {
      return NextResponse.json(
        { error: "Failed to confirm generation in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      generation: confirmedGeneration,
      jobId: workerJobId,
      operationId: workerResponse.data?.operationId,
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
