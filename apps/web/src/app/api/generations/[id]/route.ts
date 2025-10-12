import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGenerationById } from "@/lib/queries/generations";

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

    // Return generation with additional metadata
    const response = {
      ...generation,
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
