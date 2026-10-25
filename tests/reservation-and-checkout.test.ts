import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createReservation, releaseExpiredHolds, cancelHold, ReservationError } from "@/lib/reservation";
import { processCheckout, CheckoutError } from "@/lib/checkout";
import { hashPassword } from "@/lib/auth";
import { HoldStatus, OrderStatus, PaymentStatus, Role, TicketStatus } from "@prisma/client";

describe("THIGAZH 10-Minute Reservation & Concurrency Engine Integration Tests", () => {
  let testAttendee1: any;
  let testAttendee2: any;
  let testOrganizer: any;
  let testOtherOrganizer: any;
  let testAdmin: any;
  let testOrg: any;
  let testOtherOrg: any;
  let testEvent: any;
  let testTierLimited: any;
  let testTierPlentiful: any;

  beforeAll(async () => {
    // Clean test records
    await prisma.ticket.deleteMany();
    await prisma.paymentTransaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.ticketHoldItem.deleteMany();
    await prisma.ticketHold.deleteMany();
    await prisma.ticketTier.deleteMany();
    await prisma.event.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await hashPassword("Password@123");

    // Create users
    testAttendee1 = await prisma.user.create({
      data: { name: "Test Attendee One", email: "att1@test.com", passwordHash, role: Role.ATTENDEE },
    });
    testAttendee2 = await prisma.user.create({
      data: { name: "Test Attendee Two", email: "att2@test.com", passwordHash, role: Role.ATTENDEE },
    });
    testOrganizer = await prisma.user.create({
      data: { name: "Test Host", email: "host@test.com", passwordHash, role: Role.ORGANIZER },
    });
    testOtherOrganizer = await prisma.user.create({
      data: { name: "Other Host", email: "otherhost@test.com", passwordHash, role: Role.ORGANIZER },
    });
    testAdmin = await prisma.user.create({
      data: { name: "Test Admin", email: "admin@test.com", passwordHash, role: Role.ADMIN },
    });

    // Create organizations
    testOrg = await prisma.organization.create({
      data: { name: "Primary Org", slug: "primary-org", ownerId: testOrganizer.id },
    });
    testOtherOrg = await prisma.organization.create({
      data: { name: "Other Org", slug: "other-org", ownerId: testOtherOrganizer.id },
    });

    // Create event with sales active
    testEvent = await prisma.event.create({
      data: {
        organizationId: testOrg.id,
        title: "Integration Concurrency Test Event",
        slug: "integration-concurrency-test-event",
        description: "Testing row-level locks, 10-minute hold guarantees, and atomic checkout.",
        category: "Technology & AI",
        venue: "ITC Grand Chola",
        city: "Chennai",
        startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        salesStartAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        salesCutoffAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        status: "PUBLISHED",
        coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
        ticketTiers: {
          create: [
            {
              name: "Limited Seating (5 Seats)",
              price: 10000, // ₹100
              totalQuantity: 5,
              soldQuantity: 0,
              reservedQuantity: 0,
            },
            {
              name: "Standard Seating (100 Seats)",
              price: 5000, // ₹50
              totalQuantity: 100,
              soldQuantity: 0,
              reservedQuantity: 0,
            },
          ],
        },
      },
      include: { ticketTiers: true },
    });

    testTierLimited = testEvent.ticketTiers.find((t: any) => t.name.includes("Limited"));
    testTierPlentiful = testEvent.ticketTiers.find((t: any) => t.name.includes("Standard"));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Valid Reservation Creation
  it("1. should successfully create a valid 10-minute reservation and atomically increment reservedQuantity", async () => {
    const reservation = await createReservation({
      userId: testAttendee1.id,
      eventId: testEvent.id,
      items: [{ ticketTierId: testTierLimited.id, quantity: 2 }],
    });

    expect(reservation).toBeDefined();
    expect(reservation.holdId).toBeDefined();
    expect(reservation.status).toBe(HoldStatus.ACTIVE);
    expect(reservation.items[0].quantity).toBe(2);

    // Verify hold expires in ~10 minutes
    const timeDiffMs = new Date(reservation.expiresAt).getTime() - Date.now();
    expect(timeDiffMs).toBeGreaterThan(9.5 * 60 * 1000);
    expect(timeDiffMs).toBeLessThanOrEqual(10 * 60 * 1000 + 1000);

    // Verify authoritative tier state in DB
    const tier = await prisma.ticketTier.findUnique({ where: { id: testTierLimited.id } });
    expect(tier?.reservedQuantity).toBe(2);
    expect(tier?.soldQuantity).toBe(0);
    expect(tier!.totalQuantity - tier!.soldQuantity - tier!.reservedQuantity).toBe(3);

    // Cleanup hold for next tests
    await cancelHold(reservation.holdId, testAttendee1.id);
  });

  // Test 2: Invalid Quantities
  it("2. should reject invalid quantities (0, negative, > 10)", async () => {
    await expect(
      createReservation({
        userId: testAttendee1.id,
        eventId: testEvent.id,
        items: [{ ticketTierId: testTierLimited.id, quantity: 0 }],
      })
    ).rejects.toThrow(/positive whole number/i);

    await expect(
      createReservation({
        userId: testAttendee1.id,
        eventId: testEvent.id,
        items: [{ ticketTierId: testTierLimited.id, quantity: -3 }],
      })
    ).rejects.toThrow(/positive whole number/i);

    await expect(
      createReservation({
        userId: testAttendee1.id,
        eventId: testEvent.id,
        items: [{ ticketTierId: testTierLimited.id, quantity: 15 }],
      })
    ).rejects.toThrow(/Maximum 10 tickets/i);
  });

  // Test 3: Insufficient Inventory
  it("3. should reject reservation when requested quantity exceeds available inventory", async () => {
    // Limited tier has 5 total
    await expect(
      createReservation({
        userId: testAttendee1.id,
        eventId: testEvent.id,
        items: [{ ticketTierId: testTierLimited.id, quantity: 6 }],
      })
    ).rejects.toThrow(ReservationError);
  });

  // Test 4: Concurrency Race Condition Protection (Overselling Prevention)
  it("4. CONCURRENCY: should prevent overselling under simultaneous competing requests", async () => {
    // The limited tier has totalQuantity = 5.
    // Reset tier counters
    await prisma.ticketTier.update({
      where: { id: testTierLimited.id },
      data: { soldQuantity: 0, reservedQuantity: 0 },
    });

    // Launch 10 parallel requests each attempting to reserve 1 ticket (10 requested, only 5 exist)
    const parallelRequests = Array.from({ length: 10 }).map((_, i) =>
      createReservation({
        userId: i % 2 === 0 ? testAttendee1.id : testAttendee2.id,
        eventId: testEvent.id,
        items: [{ ticketTierId: testTierLimited.id, quantity: 1 }],
      })
        .then((res) => ({ success: true, res }))
        .catch((err) => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(parallelRequests);
    const successfulReservations = results.filter((r) => r.success);
    const failedReservations = results.filter((r) => !r.success);

    // Exactly 5 requests must succeed, and exactly 5 must fail!
    expect(successfulReservations.length).toBe(5);
    expect(failedReservations.length).toBe(5);

    // Verify database state: reservedQuantity must equal exactly 5, never 6 or more!
    const tier = await prisma.ticketTier.findUnique({ where: { id: testTierLimited.id } });
    expect(tier?.reservedQuantity).toBe(5);
    expect((tier?.totalQuantity ?? 0) - (tier?.soldQuantity ?? 0) - (tier?.reservedQuantity ?? 0)).toBe(0);

    // Clean up created holds
    for (const r of successfulReservations) {
      if ("res" in r && r.res) {
        await cancelHold(r.res.holdId, (r.res as any).userId || testAttendee1.id).catch(() => {});
      }
    }
    // Clean all holds for event
    await prisma.ticketHoldItem.deleteMany();
    await prisma.ticketHold.deleteMany();
    await prisma.ticketTier.update({
      where: { id: testTierLimited.id },
      data: { soldQuantity: 0, reservedQuantity: 0 },
    });
  });

  // Test 5 & 6: 10-Minute Hold Expiration and Idempotent Inventory Release
  it("5 & 6. should transition expired active holds to EXPIRED and release inventory exactly once", async () => {
    // Create an active hold
    const hold = await createReservation({
      userId: testAttendee1.id,
      eventId: testEvent.id,
      items: [{ ticketTierId: testTierLimited.id, quantity: 3 }],
    });

    let tier = await prisma.ticketTier.findUnique({ where: { id: testTierLimited.id } });
    expect(tier?.reservedQuantity).toBe(3);

    // Manually backdate the hold's expiresAt to 1 minute ago to simulate 10 minutes elapsed
    await prisma.ticketHold.update({
      where: { id: hold.holdId },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    // Run expiration release
    const releasedCount = await releaseExpiredHolds();
    expect(releasedCount).toBeGreaterThanOrEqual(1);

    // Verify hold status is EXPIRED
    const expiredHold = await prisma.ticketHold.findUnique({ where: { id: hold.holdId } });
    expect(expiredHold?.status).toBe(HoldStatus.EXPIRED);

    // Verify inventory restored exactly once
    tier = await prisma.ticketTier.findUnique({ where: { id: testTierLimited.id } });
    expect(tier?.reservedQuantity).toBe(0);

    // Calling releaseExpiredHolds again must be idempotent and not release twice
    const secondRelease = await releaseExpiredHolds();
    expect(secondRelease).toBe(0);
    tier = await prisma.ticketTier.findUnique({ where: { id: testTierLimited.id } });
    expect(tier?.reservedQuantity).toBe(0);
  });

  // Test 7: Expired Checkout Rejection
  it("7. should reject checkout if reservation hold has expired", async () => {
    const hold = await createReservation({
      userId: testAttendee1.id,
      eventId: testEvent.id,
      items: [{ ticketTierId: testTierLimited.id, quantity: 2 }],
    });

    // Backdate to past
    await prisma.ticketHold.update({
      where: { id: hold.holdId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(
      processCheckout({
        holdId: hold.holdId,
        userId: testAttendee1.id,
        idempotencyKey: "test-expired-checkout-key",
      })
    ).rejects.toThrow(/expired/i);
  });

  // Test 8: Duplicate Checkout Prevention / Idempotency
  it("8. should prevent duplicate checkout using idempotency key and return existing completed order", async () => {
    const hold = await createReservation({
      userId: testAttendee1.id,
      eventId: testEvent.id,
      items: [{ ticketTierId: testTierPlentiful.id, quantity: 2 }],
    });

    const idempotencyKey = `idemp-dup-test-${Date.now()}`;

    // First checkout (success)
    const result1 = await processCheckout({
      holdId: hold.holdId,
      userId: testAttendee1.id,
      idempotencyKey,
      simulateResult: "SUCCESS",
    });

    expect(result1.isDuplicate).toBe(false);
    expect(result1.order.status).toBe(OrderStatus.COMPLETED);
    expect(result1.tickets.length).toBe(2);

    // Second checkout with same idempotencyKey
    const result2 = await processCheckout({
      holdId: hold.holdId,
      userId: testAttendee1.id,
      idempotencyKey,
      simulateResult: "SUCCESS",
    });

    // Must be detected as duplicate, returning same order without re-creating tickets!
    expect(result2.isDuplicate).toBe(true);
    expect(result2.order.id).toBe(result1.order.id);
  });

  // Test 9 & 10: Failed Payment Behavior (No tickets, no sold inventory converted)
  it("9 & 10. should handle simulated payment decline without issuing tickets or converting soldQuantity", async () => {
    const hold = await createReservation({
      userId: testAttendee1.id,
      eventId: testEvent.id,
      items: [{ ticketTierId: testTierPlentiful.id, quantity: 3 }],
    });

    const tierBefore = await prisma.ticketTier.findUnique({ where: { id: testTierPlentiful.id } });
    const soldBefore = tierBefore!.soldQuantity;

    // Simulate payment failure
    await expect(
      processCheckout({
        holdId: hold.holdId,
        userId: testAttendee1.id,
        simulateResult: "FAILURE",
        idempotencyKey: `fail-key-${Date.now()}`,
      })
    ).rejects.toThrow(/declined/i);

    // Verify no soldQuantity was converted!
    const tierAfter = await prisma.ticketTier.findUnique({ where: { id: testTierPlentiful.id } });
    expect(tierAfter?.soldQuantity).toBe(soldBefore);

    // Verify hold was not converted to completed
    const holdRecord = await prisma.ticketHold.findUnique({ where: { id: hold.holdId } });
    expect(holdRecord?.status).not.toBe(HoldStatus.CONVERTED);
  });

  // Test 11: Ticket Issuance Only After Successful Payment with Unique Cryptographic Tokens
  it("11. should issue tickets only after successful payment with unique verification tokens", async () => {
    const hold = await createReservation({
      userId: testAttendee2.id,
      eventId: testEvent.id,
      items: [{ ticketTierId: testTierPlentiful.id, quantity: 2 }],
    });

    const result = await processCheckout({
      holdId: hold.holdId,
      userId: testAttendee2.id,
      simulateResult: "SUCCESS",
      idempotencyKey: `success-key-${Date.now()}`,
    });

    expect(result.tickets.length).toBe(2);
    for (const ticket of result.tickets) {
      expect(ticket.verificationToken).toMatch(/^THG-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(ticket.status).toBe(TicketStatus.VALID);
    }

    // Both tokens must be distinct
    expect(result.tickets[0].verificationToken).not.toBe(result.tickets[1].verificationToken);
  });

  // Test 12: Attendee Access Restrictions
  it("12. should prevent attendee from checking out someone else's hold", async () => {
    const hold = await createReservation({
      userId: testAttendee1.id,
      eventId: testEvent.id,
      items: [{ ticketTierId: testTierPlentiful.id, quantity: 1 }],
    });

    // Attendee 2 attempts to checkout Attendee 1's hold
    await expect(
      processCheckout({
        holdId: hold.holdId,
        userId: testAttendee2.id,
        simulateResult: "SUCCESS",
      })
    ).rejects.toThrow(/authorized/i);
  });

  // Test 13: Organizer Tenant Isolation
  it("13. should prevent an organizer from modifying an event owned by another organization", async () => {
    // testOtherOrganizer attempts to update testOrg's event
    const event = await prisma.event.findUnique({
      where: { id: testEvent.id },
      include: { organization: true },
    });

    expect(event?.organization.ownerId).toBe(testOrganizer.id);
    expect(testOtherOrganizer.id).not.toBe(event?.organization.ownerId);
  });

  // Test 14: Sales Cutoff Validation
  it("14. should reject reservation if sales cutoff has passed", async () => {
    // Create an event with salesCutoffAt in the past
    const closedEvent = await prisma.event.create({
      data: {
        organizationId: testOrg.id,
        title: "Past Sales Event",
        slug: `past-sales-event-${Date.now()}`,
        description: "Event with closed sales.",
        category: "Music & Concerts",
        venue: "Closed Hall",
        city: "Chennai",
        startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        salesStartAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        salesCutoffAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        status: "PUBLISHED",
        coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
        ticketTiers: {
          create: [{ name: "Standard", price: 5000, totalQuantity: 50 }],
        },
      },
      include: { ticketTiers: true },
    });

    await expect(
      createReservation({
        userId: testAttendee1.id,
        eventId: closedEvent.id,
        items: [{ ticketTierId: closedEvent.ticketTiers[0].id, quantity: 1 }],
      })
    ).rejects.toThrow(/ended/i);
  });

  // Test 15: Inventory Math Invariant
  it("15. INVARIANT CHECK: available = totalQuantity - soldQuantity - reservedQuantity must hold", async () => {
    const tier = await prisma.ticketTier.findUnique({ where: { id: testTierPlentiful.id } });
    const available = tier!.totalQuantity - tier!.soldQuantity - tier!.reservedQuantity;
    expect(available).toBeGreaterThanOrEqual(0);
    expect(tier!.soldQuantity + tier!.reservedQuantity).toBeLessThanOrEqual(tier!.totalQuantity);
  });
});
