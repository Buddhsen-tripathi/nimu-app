import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getGenerationById,
  updateGenerationStatus,
} from "@/lib/queries/generations";

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
