import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getConversations,
  createConversation,
  searchConversations,
} from "@/lib/queries/conversations";
import type { NewConversation } from "@/db/schema";

// Validation schemas
const createConversationSchema = z.object({
  title: z.string().optional(),
  type: z
    .enum(["video_generation", "audio_generation", "general_chat"])
    .default("general_chat"),
});

const searchConversationsSchema = z.object({
  query: z.string().min(1).max(100),
});

// GET /api/conversations - Fetch user's conversations
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    let conversations;
    if (query) {
      // Validate search query
      const searchValidation = searchConversationsSchema.safeParse({ query });
      if (!searchValidation.success) {
        return NextResponse.json(
          {
            error: "Invalid search query",
            details: searchValidation.error.errors,
          },
          { status: 400 }
        );
      }

      conversations = await searchConversations(session.user.id, query);
    } else {
      conversations = await getConversations(session.user.id);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedConversations = conversations.slice(startIndex, endIndex);

    return NextResponse.json({
      conversations: paginatedConversations,
      pagination: {
        page,
        limit,
        total: conversations.length,
        totalPages: Math.ceil(conversations.length / limit),
        hasNext: endIndex < conversations.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createConversationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const conversationData: NewConversation = {
      id: crypto.randomUUID(),
      userId: session.user.id,
      title: validation.data.title,
      type: validation.data.type,
      status: "active",
      isArchived: false,
      isDeleted: false,
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const conversation = await createConversation(conversationData);

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
