import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getMessages,
  createMessage,
  searchMessages,
} from "@/lib/queries/messages";

// Validation schemas
const createMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  type: z
    .enum([
      "text",
      "prompt",
      "response",
      "error",
      "generation_request",
      "generation_result",
    ])
    .default("text"),
  content: z.string().min(1).max(10000),
  metadata: z.record(z.any()).optional(),
  parentMessageId: z.string().optional(),
  tokenCount: z.number().optional(),
});

const searchMessagesSchema = z.object({
  query: z.string().min(1).max(100),
});

// GET /api/conversations/[id]/messages - Get messages for conversation
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Validate limit parameter
    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: "Invalid limit parameter (must be between 1 and 200)" },
        { status: 400 }
      );
    }

    let messages;
    if (query) {
      // Validate search query
      const searchValidation = searchMessagesSchema.safeParse({ query });
      if (!searchValidation.success) {
        return NextResponse.json(
          {
            error: "Invalid search query",
            details: searchValidation.error.errors,
          },
          { status: 400 }
        );
      }

      messages = await searchMessages(params.id, query, session.user.id);
    } else {
      messages = await getMessages(params.id, session.user.id);
    }

    // Apply limit
    const limitedMessages = messages.slice(0, limit);

    return NextResponse.json({
      messages: limitedMessages,
      total: messages.length,
      limit,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);

    // Handle specific error cases
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Create new message
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

    const body = await request.json();
    const validation = createMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const messageData = {
      id: crypto.randomUUID(),
      conversationId: params.id,
      role: validation.data.role,
      type: validation.data.type,
      content: validation.data.content,
      metadata: validation.data.metadata,
      parentMessageId: validation.data.parentMessageId,
      tokenCount: validation.data.tokenCount,
      isEdited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const message = await createMessage(messageData, session.user.id);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);

    // Handle specific error cases
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
