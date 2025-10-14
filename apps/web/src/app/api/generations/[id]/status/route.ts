import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getGenerationById,
  updateGenerationStatus,
} from "@/lib/queries/generations";
import { createWorkerClient } from "@/lib/cloudflare";

// Validation schema for status updates
const updateStatusSchema = z.object({
  status: z.enum([
    "pending_clarification",
    "pending_confirmation",
    "confirmed",
    "queued",
    "processing",
    "completed",
    "failed",
    "cancelled",
  ]),
  // Optional additional data based on status
  errorMessage: z.string().optional(),
  resultUrl: z.string().url().optional(),
  resultFilePath: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().optional(),
  fileSize: z.number().optional(),
  resolution: z.string().optional(),
  format: z.string().optional(),
  processingTime: z.number().optional(),
  cost: z.number().optional(),
  tokensUsed: z.number().optional(),
});

// GET /api/generations/[id]/status - Get generation status from Worker
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const requestId = `gen_status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      console.log("[GENERATION_STATUS] Unauthorized request", {
        requestId,
        generationId: params.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log 1: Status check request
    console.log("[GENERATION_STATUS] Request received", {
      requestId,
      generationId: params.id,
      userId: session.user.id,
      timestamp: new Date().toISOString(),
    });

    // First, verify the generation exists and user has access
    const generation = await getGenerationById(params.id, session.user.id);

    if (!generation) {
      console.error("[GENERATION_STATUS] Generation not found", {
        requestId,
        generationId: params.id,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Log 2: Generation found
    console.log("[GENERATION_STATUS] Generation found", {
      requestId,
      generationId: params.id,
      dbStatus: generation.status,
      timestamp: new Date().toISOString(),
    });

    // Get status from Cloudflare Worker
    const workerClient = createWorkerClient();

    // Use the worker generation ID if available, otherwise use the database ID
    const workerGenerationId =
      (generation as any).workerGenerationId || params.id;

    // Log 3: Checking Worker status
    console.log("[GENERATION_STATUS] Checking Worker status", {
      requestId,
      generationId: params.id,
      workerGenerationId,
      timestamp: new Date().toISOString(),
    });

    const workerResponse =
      await workerClient.getGenerationStatus(workerGenerationId);

    // Log 4: Worker response
    console.log("[GENERATION_STATUS] Worker response", {
      requestId,
      generationId: params.id,
      success: workerResponse.success,
      status: workerResponse.data?.status,
      progress: workerResponse.data?.progress,
      error: workerResponse.error,
      timestamp: new Date().toISOString(),
    });

    if (!workerResponse.success) {
      console.error("[GENERATION_STATUS] Worker status check failed", {
        requestId,
        generationId: params.id,
        error: workerResponse.error,
        timestamp: new Date().toISOString(),
      });
      // Return database status if Worker fails
      return NextResponse.json({
        generation,
        workerStatus: null,
        error: workerResponse.error,
      });
    }

    // Log 5: Returning response
    const processingTime = Date.now() - startTime;
    console.log("[GENERATION_STATUS] Returning response", {
      requestId,
      generationId: params.id,
      dbStatus: generation.status,
      workerStatus: workerResponse.data?.status,
      processingTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      generation,
      workerStatus: workerResponse.data,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("[GENERATION_STATUS] Error getting generation status", {
      requestId,
      generationId: params.id,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      timestamp: new Date().toISOString(),
    });

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

// PUT /api/generations/[id]/status - Update generation status
export async function PUT(
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

    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    // First, verify the generation exists and user has access
    const generation = await getGenerationById(params.id, session.user.id);

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Prepare additional data based on the new status
    const additionalData: any = {};

    if (validation.data.errorMessage) {
      additionalData.errorMessage = validation.data.errorMessage;
    }

    if (validation.data.resultUrl) {
      additionalData.resultUrl = validation.data.resultUrl;
    }

    if (validation.data.resultFilePath) {
      additionalData.resultFilePath = validation.data.resultFilePath;
    }

    if (validation.data.thumbnailUrl) {
      additionalData.thumbnailUrl = validation.data.thumbnailUrl;
    }

    if (validation.data.duration) {
      additionalData.duration = validation.data.duration;
    }

    if (validation.data.fileSize) {
      additionalData.fileSize = validation.data.fileSize;
    }

    if (validation.data.resolution) {
      additionalData.resolution = validation.data.resolution;
    }

    if (validation.data.format) {
      additionalData.format = validation.data.format;
    }

    if (validation.data.processingTime) {
      additionalData.processingTime = validation.data.processingTime;
    }

    if (validation.data.cost) {
      additionalData.cost = validation.data.cost;
    }

    if (validation.data.tokensUsed) {
      additionalData.tokensUsed = validation.data.tokensUsed;
    }

    // Update the generation status
    const updatedGeneration = await updateGenerationStatus(
      params.id,
      validation.data.status,
      session.user.id,
      additionalData
    );

    if (!updatedGeneration) {
      return NextResponse.json(
        { error: "Failed to update generation status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      generation: updatedGeneration,
      message: `Generation status updated to ${validation.data.status}`,
    });
  } catch (error) {
    console.error("Error updating generation status:", error);

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
