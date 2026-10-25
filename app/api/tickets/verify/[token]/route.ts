import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Role, TicketStatus } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;

    const ticket = await prisma.ticket.findUnique({
      where: { verificationToken: token },
      include: {
        ticketTier: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        orderItem: {
          include: {
            order: {
              include: {
                event: {
                  include: {
                    organization: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          isValid: false,
          error: "Invalid ticket token. Ticket not found in THIGAZH registry.",
        },
        { status: 404 }
      );
    }

    const event = ticket.orderItem.order.event;

    return NextResponse.json({
      isValid: ticket.status === TicketStatus.VALID,
      ticket: {
        id: ticket.id,
        verificationToken: ticket.verificationToken,
        status: ticket.status,
        issuedAt: ticket.issuedAt,
        usedAt: ticket.usedAt,
        tierName: ticket.ticketTier.name,
        price: ticket.ticketTier.price,
        currency: ticket.ticketTier.currency,
        attendeeName: ticket.user.name,
        attendeeEmail: ticket.user.email,
        orderNumber: ticket.orderItem.order.orderNumber,
        event: {
          id: event.id,
          title: event.title,
          venue: event.venue,
          city: event.city,
          startAt: event.startAt,
          endAt: event.endAt,
          organizationName: event.organization.name,
        },
      },
    });
  } catch (error) {
    console.error("Ticket verification error:", error);
    return NextResponse.json({ error: "Failed to verify ticket." }, { status: 500 });
  }
}

/**
 * Check-in endpoint: Mark ticket as USED at gate
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { token } = params;

    const ticket = await prisma.ticket.findUnique({
      where: { verificationToken: token },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                event: {
                  include: {
                    organization: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const eventOwnerId = ticket.orderItem.order.event.organization.ownerId;
    if (session.role !== Role.ADMIN && session.userId !== eventOwnerId) {
      return NextResponse.json(
        { error: "Forbidden. Only the organizing team can admit attendees." },
        { status: 403 }
      );
    }

    if (ticket.status === TicketStatus.USED) {
      return NextResponse.json(
        { error: "Ticket has already been admitted.", usedAt: ticket.usedAt },
        { status: 409 }
      );
    }

    if (ticket.status !== TicketStatus.VALID) {
      return NextResponse.json(
        { error: `Ticket cannot be admitted. Current status: ${ticket.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.ticket.update({
      where: { verificationToken: token },
      data: {
        status: TicketStatus.USED,
        usedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ticket verified and marked as admitted successfully.",
      ticket: updated,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "Failed to check-in ticket." }, { status: 500 });
  }
}
