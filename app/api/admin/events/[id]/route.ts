import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Role, EventStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { status } = body;

    if (!status || !Object.values(EventStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status },
      include: { organization: true },
    });

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error("Admin event status update error:", error);
    return NextResponse.json({ error: "Failed to update event status." }, { status: 500 });
  }
}
