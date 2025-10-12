import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createWorkerClient } from "@/lib/cloudflare";

// GET /api/storage/videos/[videoId] - Get video URL
export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const expiresIn = url.searchParams.get("expiresIn");
    const allowDownload = url.searchParams.get("allowDownload") === "true";

    const workerClient = createWorkerClient();

    const response = await workerClient.getVideoUrl(params.videoId, {
      expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
      allowDownload,
    });

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || "Failed to get video URL" },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error getting video URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/storage/videos/[videoId] - Delete video
export async function DELETE(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workerClient = createWorkerClient();

    const response = await workerClient.deleteVideo(params.videoId);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || "Failed to delete video" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Video deleted successfully",
      videoId: params.videoId,
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
