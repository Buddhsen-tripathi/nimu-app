import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createWorkerClient } from "@/lib/cloudflare";

// GET /api/storage/videos - List user videos
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || session.user.id;

    // Verify user can access this user's videos
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const workerClient = createWorkerClient();

    const response = await workerClient.listVideos(userId);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || "Failed to list videos" },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error listing videos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
