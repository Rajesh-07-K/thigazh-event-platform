import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { EventStatus, Role } from "@prisma/client";

const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  category: z.string().min(2, "Category is required."),
  venue: z.string().min(2, "Venue is required."),
  city: z.string().min(2, "City is required."),
  startAt: z.string().datetime("Valid start date is required."),
  endAt: z.string().datetime("Valid end date is required."),
  salesStartAt: z.string().datetime("Valid sales start date is required."),
  salesCutoffAt: z.string().datetime("Valid sales cutoff date is required."),
  coverImage: z.string().url("Valid cover image URL is required."),
  organizationId: z.string().optional(),
  ticketTiers: z
    .array(
      z.object({
        name: z.string().min(1, "Tier name is required."),
        description: z.string().optional(),
        price: z.number().int().min(0, "Price must be non-negative (in paise/cents)."),
        totalQuantity: z.number().int().min(1, "Total quantity must be at least 1."),
      })
    )
    .min(1, "At least one ticket tier is required."),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category")?.trim();
    const city = searchParams.get("city")?.trim();
    const sort = searchParams.get("sort") || "date_asc";
    const statusParam = searchParams.get("status");

    const where: any = {
      status: statusParam && Object.values(EventStatus).includes(statusParam as EventStatus)
        ? (statusParam as EventStatus)
        : EventStatus.PUBLISHED,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { venue: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "All") {
      where.category = { equals: category, mode: "insensitive" };
    }

    if (city && city !== "All") {
      where.city = { equals: city, mode: "insensitive" };
    }

    let orderBy: any = { startAt: "asc" };
    if (sort === "date_desc") {
      orderBy = { startAt: "desc" };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        ticketTiers: {
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

    // Compute derived minPrice and available inventory for each event
    const transformedEvents = events.map((event) => {
      const prices = event.ticketTiers.map((t) => t.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const totalAvailable = event.ticketTiers.reduce(
        (sum, t) => sum + Math.max(0, t.totalQuantity - t.soldQuantity - t.reservedQuantity),
        0
      );

      return {
        ...event,
        minPrice,
        totalAvailable,
      };
    });

    // Handle price sorting in memory if requested
    if (sort === "price_asc") {
      transformedEvents.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sort === "price_desc") {
      transformedEvents.sort((a, b) => b.minPrice - a.minPrice);
    }

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error("Fetch events error:", error);
    return NextResponse.json({ error: "Failed to fetch events." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (session.role !== Role.ORGANIZER && session.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden. Only event organizers can create events." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = createEventSchema.parse(body);

    // Verify organizer's organization
    let organizationId = validated.organizationId;
    if (!organizationId) {
      const userOrg = await prisma.organization.findFirst({
        where: { ownerId: session.userId },
      });
      if (!userOrg) {
        // Create an organization automatically for this organizer
        const newOrg = await prisma.organization.create({
          data: {
            name: `${session.name}'s Events`,
            slug: `${session.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`,
            ownerId: session.userId,
          },
        });
        organizationId = newOrg.id;
      } else {
        organizationId = userOrg.id;
      }
    } else {
      // Validate that user owns this organization unless admin
      if (session.role !== Role.ADMIN) {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
        });
        if (!org || org.ownerId !== session.userId) {
          return NextResponse.json(
            { error: "Forbidden. You do not own this organization." },
            { status: 403 }
          );
        }
      }
    }

    // Generate unique slug
    const baseSlug = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newEvent = await prisma.event.create({
      data: {
        organizationId,
        title: validated.title.trim(),
        slug,
        description: validated.description.trim(),
        category: validated.category.trim(),
        venue: validated.venue.trim(),
        city: validated.city.trim(),
        startAt: new Date(validated.startAt),
        endAt: new Date(validated.endAt),
        salesStartAt: new Date(validated.salesStartAt),
        salesCutoffAt: new Date(validated.salesCutoffAt),
        status: EventStatus.PUBLISHED,
        coverImage: validated.coverImage.trim(),
        ticketTiers: {
          create: validated.ticketTiers.map((tier) => ({
            name: tier.name.trim(),
            description: tier.description?.trim() || null,
            price: tier.price,
            totalQuantity: tier.totalQuantity,
            soldQuantity: 0,
            reservedQuantity: 0,
          })),
        },
      },
      include: {
        ticketTiers: true,
        organization: true,
      },
    });

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }
    console.error("Create event error:", error);
    return NextResponse.json({ error: "Failed to create event." }, { status: 500 });
  }
}
