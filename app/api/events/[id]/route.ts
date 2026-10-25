import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Role, EventStatus } from "@prisma/client";
import { releaseExpiredHolds } from "@/lib/reservation";

const updateEventSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.string().optional(),
  venue: z.string().optional(),
  city: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  salesStartAt: z.string().datetime().optional(),
  salesCutoffAt: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]).optional(),
  coverImage: z.string().url().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Prune any expired holds first so availability is strictly authoritative
    await releaseExpiredHolds();

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
          },
        },
        ticketTiers: {
          orderBy: { price: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            totalQuantity: true,
            soldQuantity: true,
            reservedQuantity: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const now = new Date();
    const isSalesOpen = now >= event.salesStartAt && now <= event.salesCutoffAt;
    const isUpcoming = now < event.startAt;

    // Calculate exact live availability for each tier
    const tiersWithAvailability = event.ticketTiers.map((tier) => {
      const available = Math.max(0, tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity);
      return {
        ...tier,
        availableQuantity: available,
        isSoldOut: available === 0,
      };
    });

    const prices = tiersWithAvailability.map((t) => t.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return NextResponse.json({
      event: {
        ...event,
        ticketTiers: tiersWithAvailability,
        minPrice,
        maxPrice,
        isSalesOpen,
        isUpcoming,
      },
    });
  } catch (error) {
    console.error("Fetch single event error:", error);
    return NextResponse.json({ error: "Failed to fetch event." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    // Role check and tenant isolation: Admin or owner of the organization
    if (session.role !== Role.ADMIN && event.organization.ownerId !== session.userId) {
      return NextResponse.json(
        { error: "Forbidden. You can only manage events from your own organization." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = updateEventSchema.parse(body);

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(validated.title && { title: validated.title.trim() }),
        ...(validated.description && { description: validated.description.trim() }),
        ...(validated.category && { category: validated.category.trim() }),
        ...(validated.venue && { venue: validated.venue.trim() }),
        ...(validated.city && { city: validated.city.trim() }),
        ...(validated.startAt && { startAt: new Date(validated.startAt) }),
        ...(validated.endAt && { endAt: new Date(validated.endAt) }),
        ...(validated.salesStartAt && { salesStartAt: new Date(validated.salesStartAt) }),
        ...(validated.salesCutoffAt && { salesCutoffAt: new Date(validated.salesCutoffAt) }),
        ...(validated.status && { status: validated.status as EventStatus }),
        ...(validated.coverImage && { coverImage: validated.coverImage.trim() }),
      },
      include: {
        ticketTiers: true,
      },
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Failed to update event." }, { status: 500 });
  }
}
