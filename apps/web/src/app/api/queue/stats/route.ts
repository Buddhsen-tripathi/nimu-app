import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createWorkerClient } from "@/lib/cloudflare";

// GET /api/queue/stats - Get queue statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workerClient = createWorkerClient();

    const response = await workerClient.getQueueStats();

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || "Failed to get queue stats" },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error getting queue stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
