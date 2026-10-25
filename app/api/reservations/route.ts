import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createReservation, ReservationError } from "@/lib/reservation";

const reservationSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format."),
  items: z
    .array(
      z.object({
        ticketTierId: z.string().uuid("Invalid tier ID format."),
        quantity: z.number().int().min(1, "Quantity must be at least 1.").max(10, "Max 10 tickets per tier."),
      })
    )
    .min(1, "At least one ticket tier must be selected."),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to reserve tickets. Please log in or sign up." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = reservationSchema.parse(body);

    const reservation = await createReservation({
      userId: session.userId,
      eventId: validated.eventId,
      items: validated.items,
    });

    return NextResponse.json({
      success: true,
      reservation,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }
    if (error instanceof ReservationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error("Reservation creation error:", error);
    return NextResponse.json(
      { error: "Failed to reserve tickets. Please try again." },
      { status: 500 }
    );
  }
}
