import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  updateGenerationStatus,
  getGenerationById,
} from "@/lib/queries/generations";
import { createMessage } from "@/lib/queries/messages";

// Webhook event types
const webhookEventSchema = z.object({
  event: z.enum([
    "generation.started",
    "generation.progress",
    "generation.completed",
    "generation.failed",
    "generation.cancelled",
  ]),
  jobId: z.string(),
  generationId: z.string(),
  userId: z.string(),
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
  progress: z.number().optional(),
  result: z
    .object({
      videoUrl: z.string().url().optional(),
      thumbnailUrl: z.string().url().optional(),
      duration: z.number().optional(),
      fileSize: z.number().optional(),
      resolution: z.string().optional(),
      format: z.string().optional(),
      processingTime: z.number().optional(),
      cost: z.number().optional(),
    })
    .optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

// POST /api/webhooks/worker - Receive webhook from Cloudflare Worker
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Log 1: Webhook received
    console.log("[WEBHOOK] Worker webhook received", {
      requestId,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
    });

    const body = await request.json();

    // Log 2: Webhook body received
    console.log("[WEBHOOK] Webhook body", {
      requestId,
      body,
      timestamp: new Date().toISOString(),
    });

    // Validate webhook payload
    const validation = webhookEventSchema.safeParse(body);

    if (!validation.success) {
      console.error("[WEBHOOK] Validation failed", {
        requestId,
        errors: validation.error.errors,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      event,
      jobId,
      generationId,
      userId,
      status,
      progress,
      result,
      error,
    } = validation.data;

    // Log 3: Processing webhook
    console.log("[WEBHOOK] Processing webhook", {
      requestId,
      event,
      jobId,
      generationId,
      userId,
      status,
      timestamp: new Date().toISOString(),
    });

    // Get generation from database
    const generation = await getGenerationById(generationId, userId);

    if (!generation) {
      console.error("[WEBHOOK] Generation not found", {
        requestId,
        generationId,
        userId,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Log 4: Generation found
    console.log("[WEBHOOK] Generation found", {
      requestId,
      generationId,
      currentStatus: generation.status,
      newStatus: status,
      timestamp: new Date().toISOString(),
    });

    // Prepare additional data for update
    const additionalData: any = {
      workerJobId: jobId,
    };

    if (progress !== undefined) {
      additionalData.progress = progress;
    }

    if (result) {
      additionalData.resultUrl = result.videoUrl;
      additionalData.thumbnailUrl = result.thumbnailUrl;
      additionalData.duration = result.duration;
      additionalData.fileSize = result.fileSize;
      additionalData.resolution = result.resolution;
      additionalData.format = result.format;
      additionalData.processingTime = result.processingTime;
      additionalData.cost = result.cost;
    }

    if (error) {
      additionalData.errorMessage = error;
    }

    // Update generation status
    const updatedGeneration = await updateGenerationStatus(
      generationId,
      status,
      userId,
      additionalData
    );

    if (!updatedGeneration) {
      console.error("[WEBHOOK] Failed to update generation", {
        requestId,
        generationId,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: "Failed to update generation" },
        { status: 500 }
      );
    }

    // Log 5: Generation updated
    console.log("[WEBHOOK] Generation updated", {
      requestId,
      generationId,
      status,
      timestamp: new Date().toISOString(),
    });

    // Create assistant message based on status
    let messageContent = "";
    let messageType: "text" | "generation_result" | "error" = "text";

    switch (status) {
      case "processing":
        messageContent = `🎬 I'm generating your video! This may take a few moments...\n\nProgress: ${progress || 0}%`;
        messageType = "text";
        break;

      case "completed":
        if (result?.videoUrl) {
          messageContent = `✅ Your video is ready!\n\nDuration: ${result.duration || "N/A"}s\nResolution: ${result.resolution || "N/A"}\nFile Size: ${(result.fileSize || 0) / 1024 / 1024} MB`;
          messageType = "generation_result";
        } else {
          messageContent = "✅ Your video has been generated successfully!";
          messageType = "generation_result";
        }
        break;

      case "failed":
        messageContent = `❌ Sorry, there was an error generating your video.\n\nError: ${error || "Unknown error"}`;
        messageType = "error";
        break;

      case "cancelled":
        messageContent = "⏹️ Your video generation has been cancelled.";
        messageType = "text";
        break;

      default:
        messageContent = `Your video generation status: ${status}`;
        messageType = "text";
    }

    // Create assistant message
    const assistantMessage = await createMessage(
      {
        id: crypto.randomUUID(),
        conversationId: generation.conversationId,
        role: "assistant",
        type: messageType,
        content: messageContent,
        metadata: {
          generationId,
          jobId,
          status,
          ...(result && { result }),
          ...(error && { error }),
        },
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      userId
    );

    // Log 6: Assistant message created
    console.log("[WEBHOOK] Assistant message created", {
      requestId,
      messageId: assistantMessage.id,
      conversationId: generation.conversationId,
      messageType,
      timestamp: new Date().toISOString(),
    });

    // Log 7: Webhook processed successfully
    const processingTime = Date.now() - startTime;
    console.log("[WEBHOOK] Webhook processed successfully", {
      requestId,
      event,
      generationId,
      status,
      processingTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      requestId,
      generationId,
      status,
      messageId: assistantMessage.id,
      processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error("[WEBHOOK] Webhook processing error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 500 }
    );
  }
}

// GET /api/webhooks/worker - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "webhook",
    timestamp: new Date().toISOString(),
  });
}
