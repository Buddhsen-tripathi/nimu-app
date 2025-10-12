import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createGeneration } from "@/lib/queries/generations";

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
  parameters: z.record(z.any()).optional(),
});

// POST /api/generations - Create generation request
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createGenerationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

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

    return NextResponse.json(generation, { status: 201 });
  } catch (error) {
    console.error("Error creating generation:", error);

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
