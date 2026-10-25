# THIGAZH (திகழ்) — Testing Documentation & Verification Suite

This document outlines the testing strategy, test scenarios, execution instructions, and concurrency proofs for THIGAZH.

---

## 1. Test Overview

THIGAZH uses **Vitest** configured for true PostgreSQL integration testing against a real PostgreSQL 18 instance. Rather than relying solely on in-memory mocks (which cannot verify PostgreSQL transactional row-locking behavior), our integration suite executes concurrent SQL transactions directly against the database engine.

### Test Runner Command:
```bash
npm run test
# or
npx vitest run
```

---

## 2. Test Coverage Matrix

| # | Test Scenario | Category | Verification Method | Result |
|---|---|---|---|---|
| 1 | **Valid Reservation Creation** | Inventory | Creates 10-min hold; reserves inventory atomically | ✅ PASS |
| 2 | **Invalid Quantities** | Validation | Rejects 0, negative values, and quantities > 10 | ✅ PASS |
| 3 | **Insufficient Inventory** | Integrity | Rejects requests exceeding available inventory | ✅ PASS |
| 4 | **Concurrent Race Conditions** | Concurrency | 10 parallel requests compete for 5 seats; exactly 5 succeed, 5 rejected | ✅ PASS |
| 5 | **10-Minute Hold Expiration** | Expiration | Transitions past-due holds from `ACTIVE` to `EXPIRED` | ✅ PASS |
| 6 | **Idempotent Expiration Release** | Inventory | Calling release multiple times releases inventory exactly once | ✅ PASS |
| 7 | **Expired Checkout Rejection** | Checkout | Attempting checkout on expired hold throws error & releases inventory | ✅ PASS |
| 8 | **Duplicate Checkout Prevention** | Idempotency | Re-submitting same idempotency key returns existing order safely | ✅ PASS |
| 9 | **Duplicate Payment Protection** | Gateway | Payment references enforce uniqueness across transactions | ✅ PASS |
| 10 | **Failed Payment Behavior** | Gateway | Simulated decline preserves inventory & issues zero tickets | ✅ PASS |
| 11 | **Ticket Issuance After Success** | Tickets | Distinct cryptographic tokens (`THG-XXXX-XXXX-XXXX`) minted only after approval | ✅ PASS |
| 12 | **Attendee Access Isolation** | Security | Attendees cannot checkout or cancel someone else's hold | ✅ PASS |
| 13 | **Organizer Tenant Isolation** | Security | Organizers cannot modify events owned by another organization | ✅ PASS |
| 14 | **Sales Cutoff Validation** | Time Window | Rejects reservations when sales cutoff has passed | ✅ PASS |
| 15 | **Inventory Math Invariant** | Invariant | Asserts `available = total - sold - reserved` remains non-negative | ✅ PASS |

---

## 3. Concurrency & Overselling Proof

To test row-locking correctness under race conditions, `tests/reservation-and-checkout.test.ts` executes **10 simultaneous asynchronous requests** competing for a ticket tier with **only 5 total seats**.

```typescript
// From tests/reservation-and-checkout.test.ts
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
const successful = results.filter((r) => r.success);
const failed = results.filter((r) => !r.success);

// Exactly 5 succeed, exactly 5 fail:
expect(successful.length).toBe(5);
expect(failed.length).toBe(5);

// The tier reservedQuantity is exactly 5:
const tier = await prisma.ticketTier.findUnique({ where: { id: testTierLimited.id } });
expect(tier.reservedQuantity).toBe(5);
```

Because `lib/reservation.ts` utilizes `SELECT ... FOR UPDATE` with alphabetical lock ordering inside PostgreSQL transactions, concurrent transactions queue deterministically and no double-allocation occurs.

---

## 4. Running the Test Suite Locally

1. Ensure PostgreSQL is running on `localhost:5432` with databases `thigazh_db` and `thigazh_test_db`.
2. Run database migrations:
   ```bash
   npx prisma db push
   ```
3. Run the automated test runner:
   ```bash
   npm run test
   ```
4. All 13 test suites run in < 1 second and report full status.
