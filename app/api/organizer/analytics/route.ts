import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Role, OrderStatus, HoldStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== Role.ORGANIZER && session.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden. Only event organizers can access analytics." },
        { status: 403 }
      );
    }

    // Find the organizer's organization(s)
    const organizations = await prisma.organization.findMany({
      where: session.role === Role.ADMIN ? {} : { ownerId: session.userId },
      select: { id: true, name: true },
    });

    const orgIds = organizations.map((o) => o.id);

    // Fetch all events for this organizer
    const events = await prisma.event.findMany({
      where: {
        organizationId: { in: orgIds },
      },
      include: {
        ticketTiers: true,
        orders: {
          where: { status: OrderStatus.COMPLETED },
          include: {
            user: {
              select: { name: true, email: true },
            },
            items: {
              include: {
                ticketTier: true,
              },
            },
            transactions: true,
          },
        },
        holds: {
          where: {
            status: HoldStatus.ACTIVE,
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    let totalSuccessfulRevenue = 0;
    let totalTicketsSold = 0;
    let totalAvailableInventory = 0;
    let activeHoldsCount = 0;
    let totalBookingsCount = 0;

    const eventSummaries: Array<{
      id: string;
      title: string;
      category: string;
      venue: string;
      city: string;
      startAt: Date;
      status: string;
      revenue: number;
      ticketsSold: number;
      totalCapacity: number;
      available: number;
      tierBreakdown: Array<{
        name: string;
        price: number;
        total: number;
        sold: number;
        reserved: number;
        available: number;
      }>;
    }> = [];

    const recentOrders: Array<{
      id: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      eventTitle: string;
      totalAmount: number;
      currency: string;
      createdAt: Date;
      itemsCount: number;
    }> = [];

    // Aggregations
    for (const event of events) {
      activeHoldsCount += event.holds.length;
      totalBookingsCount += event.orders.length;

      let eventRevenue = 0;
      let eventTicketsSold = 0;
      let eventCapacity = 0;
      let eventAvailable = 0;

      const tierBreakdown = event.ticketTiers.map((tier) => {
        const available = Math.max(0, tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity);
        eventCapacity += tier.totalQuantity;
        eventTicketsSold += tier.soldQuantity;
        eventAvailable += available;

        return {
          name: tier.name,
          price: tier.price,
          total: tier.totalQuantity,
          sold: tier.soldQuantity,
          reserved: tier.reservedQuantity,
          available,
        };
      });

      for (const order of event.orders) {
        eventRevenue += order.totalAmount;
        recentOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user.name,
          customerEmail: order.user.email,
          eventTitle: event.title,
          totalAmount: order.totalAmount,
          currency: order.currency,
          createdAt: order.createdAt,
          itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        });
      }

      totalSuccessfulRevenue += eventRevenue;
      totalTicketsSold += eventTicketsSold;
      totalAvailableInventory += eventAvailable;

      eventSummaries.push({
        id: event.id,
        title: event.title,
        category: event.category,
        venue: event.venue,
        city: event.city,
        startAt: event.startAt,
        status: event.status,
        revenue: eventRevenue,
        ticketsSold: eventTicketsSold,
        totalCapacity: eventCapacity,
        available: eventAvailable,
        tierBreakdown,
      });
    }

    // Sort recent orders descending by date
    recentOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Compute simple chronological daily revenue chart data
    const revenueMap: { [date: string]: number } = {};
    for (const order of recentOrders) {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      revenueMap[dateKey] = (revenueMap[dateKey] || 0) + order.totalAmount;
    }

    const revenueTrend = Object.entries(revenueMap).map(([date, amount]) => ({
      date,
      revenueInRupees: Math.round(amount / 100),
    }));

    if (revenueTrend.length === 0) {
      revenueTrend.push({
        date: new Date().toISOString().split("T")[0],
        revenueInRupees: Math.round(totalSuccessfulRevenue / 100),
      });
    }

    return NextResponse.json({
      organizations,
      overview: {
        totalSuccessfulRevenue,
        totalTicketsSold,
        totalAvailableInventory,
        activeHoldsCount,
        totalBookingsCount,
        totalEventsCount: events.length,
      },
      revenueTrend,
      eventSummaries,
      recentOrders: recentOrders.slice(0, 15),
    });
  } catch (error) {
    console.error("Organizer analytics error:", error);
    return NextResponse.json({ error: "Failed to generate analytics." }, { status: 500 });
  }
}
