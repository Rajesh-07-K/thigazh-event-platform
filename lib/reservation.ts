import { prisma } from "@/lib/db";
import { Prisma, HoldStatus } from "@prisma/client";

export class ReservationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code: string = "RESERVATION_ERROR", statusCode: number = 400) {
    super(message);
    this.name = "ReservationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface ReservationItemInput {
  ticketTierId: string;
  quantity: number;
}

export interface CreateReservationParams {
  userId: string;
  eventId: string;
  items: ReservationItemInput[];
}

/**
 * Release any active holds that have passed their expiration timestamp.
 * Idempotent, safe to call repeatedly.
 */
export async function releaseExpiredHolds(tx?: Prisma.TransactionClient): Promise<number> {
  const client = tx || prisma;
  const now = new Date();

  // Find all holds that are ACTIVE and expired
  const expiredHolds = await client.ticketHold.findMany({
    where: {
      status: HoldStatus.ACTIVE,
      expiresAt: { lte: now },
    },
    include: {
      items: true,
    },
  });

  if (expiredHolds.length === 0) {
    return 0;
  }

  let releasedCount = 0;

  for (const hold of expiredHolds) {
    // If not already in an outer transaction, wrap each hold release in a transaction
    if (tx) {
      await releaseSingleHold(tx, hold.id);
      releasedCount++;
    } else {
      try {
        await prisma.$transaction(async (innerTx) => {
          await releaseSingleHold(innerTx, hold.id);
        });
        releasedCount++;
      } catch (err) {
        console.error(`Error releasing expired hold ${hold.id}:`, err);
      }
    }
  }

  return releasedCount;
}

/**
 * Internal helper to release a single hold safely with row lock
 */
async function releaseSingleHold(tx: Prisma.TransactionClient, holdId: string) {
  // Query raw for update to lock the hold row
  const lockedHolds = await tx.$queryRaw<Array<{ id: string; status: HoldStatus }>>`
    SELECT id, status FROM "TicketHold"
    WHERE id = ${holdId}
    FOR UPDATE
  `;

  if (!lockedHolds.length || lockedHolds[0].status !== HoldStatus.ACTIVE) {
    return;
  }

  const holdWithItems = await tx.ticketHold.findUnique({
    where: { id: holdId },
    include: { items: true },
  });

  if (!holdWithItems || holdWithItems.status !== HoldStatus.ACTIVE) {
    return;
  }

  // Update hold status to EXPIRED
  await tx.ticketHold.update({
    where: { id: holdId },
    data: { status: HoldStatus.EXPIRED },
  });

  // Sort tiers to prevent deadlocks
  const sortedItems = [...holdWithItems.items].sort((a, b) =>
    a.ticketTierId.localeCompare(b.ticketTierId)
  );

  for (const item of sortedItems) {
    // Lock and decrement reserved quantity
    await tx.$queryRaw`
      SELECT id FROM "TicketTier"
      WHERE id = ${item.ticketTierId}
      FOR UPDATE
    `;

    await tx.ticketTier.update({
      where: { id: item.ticketTierId },
      data: {
        reservedQuantity: {
          decrement: item.quantity,
        },
      },
    });
  }
}

/**
 * Creates a 10-minute hold on requested ticket tiers atomically.
 * Prevents overselling under concurrent requests using row-level locking.
 */
export async function createReservation(params: CreateReservationParams) {
  const { userId, eventId, items } = params;

  if (!items || items.length === 0) {
    throw new ReservationError("At least one ticket tier must be selected.", "INVALID_ITEMS", 400);
  }

  // Validate quantities
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new ReservationError(
        "Ticket quantity must be a positive whole number.",
        "INVALID_QUANTITY",
        400
      );
    }
    if (item.quantity > 10) {
      throw new ReservationError(
        "Maximum 10 tickets per tier allowed in a single order.",
        "QUANTITY_LIMIT_EXCEEDED",
        400
      );
    }
  }

  // Sort items by ticketTierId to guarantee consistent lock ordering and avoid deadlocks
  const sortedItems = [...items].sort((a, b) => a.ticketTierId.localeCompare(b.ticketTierId));

  // Run everything inside an interactive transaction with PostgreSQL row-level locks
  return await prisma.$transaction(
    async (tx) => {
      // 1. First, release any expired holds to free up stale inventory
      await releaseExpiredHolds(tx);

      // 2. Fetch and validate event
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new ReservationError("Event not found.", "EVENT_NOT_FOUND", 404);
      }

      if (event.status !== "PUBLISHED") {
        throw new ReservationError("This event is not published or active for booking.", "EVENT_NOT_ACTIVE", 400);
      }

      const now = new Date();
      if (now < event.salesStartAt) {
        throw new ReservationError("Ticket sales have not opened yet.", "SALES_NOT_STARTED", 400);
      }

      if (now > event.salesCutoffAt) {
        throw new ReservationError("Ticket sales have ended for this event.", "SALES_CLOSED", 400);
      }

      // 3. Lock each requested ticket tier in alphabetical order
      const tierDetails: Array<{
        id: string;
        name: string;
        price: number;
        currency: string;
        totalQuantity: number;
        soldQuantity: number;
        reservedQuantity: number;
        requestedQuantity: number;
      }> = [];

      let totalAmount = 0;

      for (const item of sortedItems) {
        // Row-level lock via SELECT FOR UPDATE
        const lockedRows = await tx.$queryRaw<
          Array<{
            id: string;
            name: string;
            price: number;
            currency: string;
            totalQuantity: number;
            soldQuantity: number;
            reservedQuantity: number;
          }>
        >`
          SELECT id, name, price, currency, "totalQuantity", "soldQuantity", "reservedQuantity"
          FROM "TicketTier"
          WHERE id = ${item.ticketTierId} AND "eventId" = ${eventId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new ReservationError(
            `Ticket tier with ID ${item.ticketTierId} does not exist for this event.`,
            "TIER_NOT_FOUND",
            404
          );
        }

        const tier = lockedRows[0];
        const available = tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity;

        if (item.quantity > available) {
          throw new ReservationError(
            `Insufficient tickets for "${tier.name}". Requested: ${item.quantity}, Available: ${Math.max(
              0,
              available
            )}.`,
            "INSUFFICIENT_INVENTORY",
            409
          );
        }

        tierDetails.push({
          ...tier,
          requestedQuantity: item.quantity,
        });

        totalAmount += tier.price * item.quantity;
      }

      // 4. Update reserved inventory for each tier
      for (const tier of tierDetails) {
        await tx.ticketTier.update({
          where: { id: tier.id },
          data: {
            reservedQuantity: {
              increment: tier.requestedQuantity,
            },
          },
        });
      }

      // 5. Create 10-minute hold record (10 * 60 * 1000 ms)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const hold = await tx.ticketHold.create({
        data: {
          userId,
          eventId,
          status: HoldStatus.ACTIVE,
          expiresAt,
          items: {
            create: tierDetails.map((t) => ({
              ticketTierId: t.id,
              quantity: t.requestedQuantity,
              unitPrice: t.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              ticketTier: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              venue: true,
              city: true,
              startAt: true,
            },
          },
        },
      });

      return {
        holdId: hold.id,
        eventId: hold.eventId,
        status: hold.status,
        expiresAt: hold.expiresAt,
        totalAmount,
        currency: tierDetails[0]?.currency || "INR",
        items: hold.items.map((i) => ({
          ticketTierId: i.ticketTierId,
          tierName: i.ticketTier.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
        })),
        event: hold.event,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 10000,
    }
  );
}

/**
 * Attendee voluntarily releases an active hold before expiration
 */
export async function cancelHold(holdId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const lockedHolds = await tx.$queryRaw<Array<{ id: string; status: HoldStatus; userId: string }>>`
      SELECT id, status, "userId" FROM "TicketHold"
      WHERE id = ${holdId}
      FOR UPDATE
    `;

    if (!lockedHolds.length) {
      throw new ReservationError("Hold not found.", "HOLD_NOT_FOUND", 404);
    }

    const hold = lockedHolds[0];
    if (hold.userId !== userId) {
      throw new ReservationError("Unauthorized to cancel this hold.", "FORBIDDEN", 403);
    }

    if (hold.status !== HoldStatus.ACTIVE) {
      return { success: true, message: `Hold was already in state: ${hold.status}` };
    }

    const holdWithItems = await tx.ticketHold.findUnique({
      where: { id: holdId },
      include: { items: true },
    });

    if (!holdWithItems) {
      throw new ReservationError("Hold items not found.", "HOLD_NOT_FOUND", 404);
    }

    // Mark as RELEASED
    await tx.ticketHold.update({
      where: { id: holdId },
      data: { status: HoldStatus.RELEASED },
    });

    // Decrement reserved inventory
    for (const item of holdWithItems.items) {
      await tx.$queryRaw`
        SELECT id FROM "TicketTier"
        WHERE id = ${item.ticketTierId}
        FOR UPDATE
      `;

      await tx.ticketTier.update({
        where: { id: item.ticketTierId },
        data: {
          reservedQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    return { success: true, message: "Hold successfully released." };
  });
}
