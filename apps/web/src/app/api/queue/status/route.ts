import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createWorkerClient } from "@/lib/cloudflare";

// GET /api/queue/status - Get queue status
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workerClient = createWorkerClient();

    const response = await workerClient.getQueueStatus();

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || "Failed to get queue status" },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error getting queue status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
