import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGenerationById } from "@/lib/queries/generations";
import { createWorkerClient } from "@/lib/cloudflare";

// GET /api/generations/[id] - Get generation details and status
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

    const generation = await getGenerationById(params.id, session.user.id);

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Get real-time status from Worker if available
    let workerStatus = null;
    if (
      (generation as any).workerGenerationId ||
      generation.status === "queued" ||
      generation.status === "processing"
    ) {
      try {
        const workerClient = createWorkerClient();

        const workerGenerationId =
          (generation as any).workerGenerationId || params.id;
        const workerResponse =
          await workerClient.getGenerationStatus(workerGenerationId);

        if (workerResponse.success) {
          workerStatus = workerResponse.data;
        }
      } catch (error) {
        console.warn("Failed to get worker status:", error);
        // Continue without worker status
      }
    }

    // Return generation with additional metadata
    const response = {
      ...generation,
      workerStatus,
      // Add computed fields
      isActive: [
        "pending_clarification",
        "pending_confirmation",
        "queued",
        "processing",
      ].includes(generation.status),
      isCompleted: generation.status === "completed",
      isFailed: generation.status === "failed",
      canCancel: ["pending_confirmation", "queued", "processing"].includes(
        generation.status
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
