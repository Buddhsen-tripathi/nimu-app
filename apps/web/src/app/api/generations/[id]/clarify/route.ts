import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getGenerationById,
  updateGenerationClarification,
} from "@/lib/queries/generations";

// Validation schema for clarification submission
const submitClarificationSchema = z.object({
  clarificationResponses: z.record(z.any()),
  // Optional: AI can generate new clarification questions
  clarificationQuestions: z.record(z.any()).optional(),
});

// POST /api/generations/[id]/clarify - Submit clarification response
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

    if (generation.status !== "pending_clarification") {
      return NextResponse.json(
        { error: "Generation is not in clarification stage" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = submitClarificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    // Update the generation with clarification responses
    const updatedGeneration = await updateGenerationClarification(
      params.id,
      validation.data.clarificationQuestions ||
        generation.clarificationQuestions,
      validation.data.clarificationResponses,
      session.user.id
    );

    if (!updatedGeneration) {
      return NextResponse.json(
        { error: "Failed to update generation" },
        { status: 500 }
      );
    }

    // TODO: Here you would typically trigger AI processing to analyze
    // the clarification responses and potentially generate new questions
    // or move to confirmation stage. For now, we'll move directly to
    // pending_confirmation status.

    return NextResponse.json({
      generation: updatedGeneration,
      message: "Clarification submitted successfully",
      nextStep: "confirmation",
    });
  } catch (error) {
    console.error("Error submitting clarification:", error);

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
