import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Fetch user's orders with tickets
    const orders = await prisma.order.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            venue: true,
            city: true,
            startAt: true,
            endAt: true,
            coverImage: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
        items: {
          include: {
            ticketTier: true,
            tickets: true,
          },
        },
        transactions: true,
      },
    });

    const now = new Date();
    const upcomingOrders = orders.filter(
      (o) => o.status === "COMPLETED" && new Date(o.event.startAt) >= now
    );
    const pastOrders = orders.filter(
      (o) => o.status === "COMPLETED" && new Date(o.event.startAt) < now
    );

    return NextResponse.json({
      orders,
      upcomingOrders,
      pastOrders,
    });
  } catch (error) {
    console.error("Fetch attendee tickets error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets." }, { status: 500 });
  }
}
