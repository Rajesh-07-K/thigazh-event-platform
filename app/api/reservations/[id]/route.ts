import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { cancelHold, releaseExpiredHolds, ReservationError } from "@/lib/reservation";
import { HoldStatus } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;

    const hold = await prisma.ticketHold.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            venue: true,
            city: true,
            startAt: true,
            coverImage: true,
          },
        },
        items: {
          include: {
            ticketTier: {
              select: {
                id: true,
                name: true,
                price: true,
                currency: true,
              },
            },
          },
        },
      },
    });

    if (!hold) {
      return NextResponse.json({ error: "Reservation hold not found." }, { status: 404 });
    }

    // Security: attendee can only access their own hold
    if (hold.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(hold.expiresAt);
    const isExpired = now >= expiresAt;

    if (isExpired && hold.status === HoldStatus.ACTIVE) {
      // Trigger release
      await releaseExpiredHolds();
      return NextResponse.json({
        hold: {
          ...hold,
          status: HoldStatus.EXPIRED,
          remainingSeconds: 0,
          isExpired: true,
        },
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    const totalAmount = hold.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return NextResponse.json({
      hold: {
        ...hold,
        remainingSeconds,
        isExpired: remainingSeconds === 0,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Fetch reservation error:", error);
    return NextResponse.json({ error: "Failed to fetch reservation." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;
    const result = await cancelHold(id, session.userId);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ReservationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Cancel hold error:", error);
    return NextResponse.json({ error: "Failed to release reservation hold." }, { status: 500 });
  }
}
