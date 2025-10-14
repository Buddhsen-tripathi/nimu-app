import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createGeneration } from "@/lib/queries/generations";
import { createWorkerClient } from "@/lib/cloudflare";

// Validation schema for generation request
const createGenerationSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  type: z.enum(["video", "audio"]),
  provider: z.enum([
    "veo3",
    "runway",
    "pika",
    "stable_video",
    "elevenlabs",
    "murf",
    "synthesia",
  ]),
  model: z.string().min(1).max(100),
  prompt: z.string().min(1).max(2000),
  parameters: z.record(z.string(), z.any()).optional(),
});

// POST /api/generations - Create generation request
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `gen_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      console.log("[GENERATION_CREATE] Unauthorized request", {
        requestId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Log 1: Request received
    console.log("[GENERATION_CREATE] Request received", {
      requestId,
      userId: session.user.id,
      conversationId: body.conversationId,
      messageId: body.messageId,
      prompt: body.prompt,
      provider: body.provider,
      type: body.type,
      timestamp: new Date().toISOString(),
    });

    const validation = createGenerationSchema.safeParse(body);

    if (!validation.success) {
      console.error("[GENERATION_CREATE] Validation failed", {
        requestId,
        errors: validation.error.issues,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Create generation in database first
    const generationData = {
      id: crypto.randomUUID(),
      conversationId: validation.data.conversationId,
      messageId: validation.data.messageId,
      userId: session.user.id,
      type: validation.data.type,
      provider: validation.data.provider,
      model: validation.data.model,
      prompt: validation.data.prompt,
      parameters: validation.data.parameters,
      status: "pending_clarification" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const generation = await createGeneration(generationData, session.user.id);

    // Log 2: Generation created in DB
    console.log("[GENERATION_CREATE] Generation created in DB", {
      requestId,
      generationId: generation.id,
      status: generation.status,
      timestamp: new Date().toISOString(),
    });

    // Initialize Worker client with user ID as auth token
    const workerClient = createWorkerClient(
      undefined, // Use default worker URL
      `dev_${session.user.id}` // Use dev token format for authentication
    );

    // Log 3: Calling Worker API
    console.log("[GENERATION_CREATE] Calling Worker API", {
      requestId,
      generationId: generation.id,
      workerUrl: workerClient["config"].baseUrl,
      timestamp: new Date().toISOString(),
    });

    // Send generation request to Cloudflare Worker
    const workerResponse = await workerClient.createGeneration(
      session.user.id,
      {
        generationId: generation.id, // ← Send the generation ID to Worker
        prompt: validation.data.prompt,
        parameters: {
          ...validation.data.parameters,
          model: validation.data.model,
          provider: validation.data.provider,
          type: validation.data.type,
          conversationId: validation.data.conversationId,
          messageId: validation.data.messageId,
        },
      }
    );

    // Log 4: Worker response
    console.log("[GENERATION_CREATE] Worker response", {
      requestId,
      generationId: generation.id,
      success: workerResponse.success,
      workerGenerationId: workerResponse.data?.generationId,
      queuePosition: workerResponse.data?.queuePosition,
      clarificationRequired: workerResponse.data?.clarificationRequired,
      error: workerResponse.error,
      timestamp: new Date().toISOString(),
    });

    if (!workerResponse.success) {
      console.error("[GENERATION_CREATE] Worker generation creation failed", {
        requestId,
        generationId: generation.id,
        error: workerResponse.error,
        timestamp: new Date().toISOString(),
      });
      // Return the database generation even if Worker fails
      // The Worker can retry later
    }

    // Log 5: Returning response
    const processingTime = Date.now() - startTime;
    console.log("[GENERATION_CREATE] Returning response", {
      requestId,
      generationId: generation.id,
      status: generation.status,
      processingTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        ...generation,
        workerGenerationId: workerResponse.data?.generationId,
        clarificationRequired: workerResponse.data?.clarificationRequired,
        clarificationQuestions: workerResponse.data?.clarificationQuestions,
      },
      { status: 201 }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("[GENERATION_CREATE] Error creating generation", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Conversation or message not found" },
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
