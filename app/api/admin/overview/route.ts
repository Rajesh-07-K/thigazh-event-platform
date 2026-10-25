import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Role, OrderStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    const [userCount, orgCount, eventCount, orders] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.event.count(),
      prisma.order.findMany({
        where: { status: OrderStatus.COMPLETED },
        select: { totalAmount: true },
      }),
    ]);

    const totalRevenue = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const recentEvents = await prisma.event.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: { name: true },
        },
        _count: {
          select: { orders: true, ticketTiers: true },
        },
      },
    });

    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers: userCount,
        totalOrganizations: orgCount,
        totalEvents: eventCount,
        totalRevenue,
      },
      recentEvents,
      recentUsers,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: "Failed to fetch admin stats." }, { status: 500 });
  }
}
