import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/reservation";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow local development without secret if not set or matches
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
      }
    }

    const released = await releaseExpiredHolds();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      releasedHoldsCount: released,
    });
  } catch (error) {
    console.error("Cron hold release error:", error);
    return NextResponse.json({ error: "Failed to release expired holds." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
