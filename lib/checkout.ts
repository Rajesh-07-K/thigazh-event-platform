import { prisma } from "@/lib/db";
import { Prisma, HoldStatus, OrderStatus, PaymentStatus, TicketStatus } from "@prisma/client";
import { randomBytes } from "crypto";

export class CheckoutError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code: string = "CHECKOUT_ERROR", statusCode: number = 400) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface ProcessCheckoutParams {
  holdId: string;
  userId: string;
  idempotencyKey?: string;
  simulateResult?: "SUCCESS" | "FAILURE";
  paymentMethod?: string;
}

/**
 * Generates an alphanumeric verification token for tickets
 */
function generateVerificationToken(): string {
  const rand = randomBytes(6).toString("hex").toUpperCase();
  return `THG-${rand.slice(0, 4)}-${rand.slice(4, 8)}-${rand.slice(8, 12)}`;
}

/**
 * Generates a human-friendly order reference number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `THG-ORD-${timestamp}-${rand}`;
}

export async function processCheckout(params: ProcessCheckoutParams) {
  const { holdId, userId, idempotencyKey, simulateResult = "SUCCESS", paymentMethod = "UPI_MOCK" } = params;

  // 1. Idempotency Check: If an order already exists for this idempotencyKey, return it
  if (idempotencyKey) {
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: {
        items: {
          include: {
            ticketTier: true,
            tickets: true,
          },
        },
        transactions: true,
        event: true,
      },
    });

    if (existingOrder) {
      return {
        isDuplicate: true,
        order: existingOrder,
        tickets: existingOrder.items.flatMap((item) => item.tickets),
      };
    }
  }

  // 2. Interactive transaction with PostgreSQL row locking
  return await prisma.$transaction(
    async (tx) => {
      // Lock the hold row
      const lockedHolds = await tx.$queryRaw<
        Array<{
          id: string;
          status: HoldStatus;
          userId: string;
          eventId: string;
          expiresAt: Date;
        }>
      >`
        SELECT id, status, "userId", "eventId", "expiresAt"
        FROM "TicketHold"
        WHERE id = ${holdId}
        FOR UPDATE
      `;

      if (!lockedHolds || lockedHolds.length === 0) {
        throw new CheckoutError("Reservation hold not found.", "HOLD_NOT_FOUND", 404);
      }

      const hold = lockedHolds[0];

      // Ensure hold belongs to requesting user
      if (hold.userId !== userId) {
        throw new CheckoutError("You are not authorized to check out this reservation.", "FORBIDDEN", 403);
      }

      // Check if hold has already been converted
      if (hold.status === HoldStatus.CONVERTED) {
        // Find existing order for this hold
        const convertedOrder = await tx.order.findFirst({
          where: { holdId: hold.id },
          include: {
            items: {
              include: {
                ticketTier: true,
                tickets: true,
              },
            },
            transactions: true,
            event: true,
          },
        });

        if (convertedOrder) {
          return {
            isDuplicate: true,
            order: convertedOrder,
            tickets: convertedOrder.items.flatMap((item) => item.tickets),
          };
        }

        throw new CheckoutError(
          "This reservation has already been completed.",
          "HOLD_ALREADY_CONVERTED",
          409
        );
      }

      // Check if hold was already cancelled or expired
      if (hold.status !== HoldStatus.ACTIVE) {
        throw new CheckoutError(
          `This reservation hold cannot be checked out because it is ${hold.status.toLowerCase()}.`,
          "HOLD_INACTIVE",
          400
        );
      }

      // Check if hold expired
      const now = new Date();
      if (now > new Date(hold.expiresAt)) {
        // Mark hold expired and restore inventory safely
        await tx.ticketHold.update({
          where: { id: hold.id },
          data: { status: HoldStatus.EXPIRED },
        });

        const holdItems = await tx.ticketHoldItem.findMany({
          where: { holdId: hold.id },
        });

        for (const item of holdItems) {
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

        throw new CheckoutError(
          "Your 10-minute reservation hold has expired. The tickets have been released.",
          "HOLD_EXPIRED",
          410
        );
      }

      // Fetch hold with items
      const holdWithItems = await tx.ticketHold.findUnique({
        where: { id: hold.id },
        include: {
          items: {
            include: {
              ticketTier: true,
            },
          },
          event: true,
        },
      });

      if (!holdWithItems || holdWithItems.items.length === 0) {
        throw new CheckoutError("Reservation contains no ticket items.", "EMPTY_HOLD", 400);
      }

      const totalAmount = holdWithItems.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const currency = holdWithItems.items[0]?.ticketTier.currency || "INR";

      // 3. Handle SIMULATED FAILURE
      if (simulateResult === "FAILURE") {
        const failedPaymentRef = `PAY-FAIL-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
        
        // Record failed transaction for auditing
        const failedOrder = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId,
            eventId: hold.eventId,
            holdId: hold.id,
            status: OrderStatus.CANCELLED,
            totalAmount,
            currency,
            idempotencyKey: idempotencyKey ? `${idempotencyKey}-failed` : null,
            transactions: {
              create: [
                {
                  paymentReference: failedPaymentRef,
                  idempotencyKey: idempotencyKey || null,
                  amount: totalAmount,
                  currency,
                  status: PaymentStatus.REJECTED,
                  processedAt: new Date(),
                  gatewayResponse: JSON.stringify({
                    gateway: "THIGAZH_MOCK_GATEWAY",
                    status: "REJECTED",
                    reason: "Simulated payment decline by issuer/user.",
                    method: paymentMethod,
                  }),
                },
              ],
            },
          },
          include: {
            transactions: true,
          },
        });

        throw new CheckoutError(
          "Payment was declined by mock gateway. No tickets were issued and reserved inventory was preserved.",
          "PAYMENT_DECLINED",
          402
        );
      }

      // 4. Handle SUCCESSFUL PAYMENT & ATOMIC INVENTORY CONVERSION
      // Sort items by ticketTierId to prevent lock deadlocks
      const sortedItems = [...holdWithItems.items].sort((a, b) =>
        a.ticketTierId.localeCompare(b.ticketTierId)
      );

      for (const item of sortedItems) {
        // Lock tier row
        await tx.$queryRaw`
          SELECT id FROM "TicketTier"
          WHERE id = ${item.ticketTierId}
          FOR UPDATE
        `;

        // Atomically convert reserved quantity to sold quantity
        await tx.ticketTier.update({
          where: { id: item.ticketTierId },
          data: {
            reservedQuantity: {
              decrement: item.quantity,
            },
            soldQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // Transition hold to CONVERTED
      await tx.ticketHold.update({
        where: { id: hold.id },
        data: { status: HoldStatus.CONVERTED },
      });

      // Create Order
      const orderNumber = generateOrderNumber();
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          eventId: hold.eventId,
          holdId: hold.id,
          status: OrderStatus.COMPLETED,
          totalAmount,
          currency,
          idempotencyKey: idempotencyKey || null,
        },
      });

      // Create OrderItems and Individual Digital Tickets
      const issuedTickets: Array<{
        id: string;
        orderItemId: string;
        ticketTierId: string;
        userId: string;
        verificationToken: string;
        status: TicketStatus;
        issuedAt: Date;
      }> = [];

      for (const item of holdWithItems.items) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            ticketTierId: item.ticketTierId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          },
        });

        for (let i = 0; i < item.quantity; i++) {
          const verificationToken = generateVerificationToken();
          const ticket = await tx.ticket.create({
            data: {
              orderItemId: orderItem.id,
              ticketTierId: item.ticketTierId,
              userId,
              verificationToken,
              status: TicketStatus.VALID,
            },
          });
          issuedTickets.push(ticket);
        }
      }

      // Record successful PaymentTransaction
      const paymentRef = `PAY-MOCK-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
      const transaction = await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          paymentReference: paymentRef,
          idempotencyKey: idempotencyKey || null,
          amount: totalAmount,
          currency,
          status: PaymentStatus.APPROVED,
          processedAt: new Date(),
          gatewayResponse: JSON.stringify({
            gateway: "THIGAZH_MOCK_GATEWAY",
            status: "APPROVED",
            authCode: "THG-AUTH-SUCCESS",
            method: paymentMethod,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return {
        isDuplicate: false,
        order: {
          ...order,
          items: holdWithItems.items,
          transactions: [transaction],
          event: holdWithItems.event,
        },
        tickets: issuedTickets,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 10000,
    }
  );
}
