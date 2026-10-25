# THIGAZH (திகழ்) — System Architecture

**Tagline:** Events That Make You Shine.

---

## 1. Architectural Principles

THIGAZH is built as a single, coherent, full-stack application utilizing Next.js 14 App Router, TypeScript, Tailwind CSS, PostgreSQL 18, and Prisma ORM.

### Key Architectural Tenets:
1. **Zero Microservices Overengineering:** A modular monolith in one unified codebase minimizing operational complexity, serialization boundaries, and deployment friction.
2. **Authoritative Database Source of Truth:** PostgreSQL is the single source of truth for event scheduling, inventory calculations, temporary holds, and financial order completion.
3. **Strict Inventory Invariants:** Every ticket tier enforces:
   $$\text{available} = \text{totalQuantity} - \text{soldQuantity} - \text{reservedQuantity}$$
   Overselling is impossible even under high concurrency because inventory increments and conversions run inside serializable/read-committed transactions protected by PostgreSQL row-level locks (`SELECT ... FOR UPDATE`).
4. **Tenant Isolation:** Organizers can only inspect, modify, and query aggregated analytics for their own organization's events and orders. Attendees can only view their own reservations and digital tickets. Platform administrators have server-verified access to moderation actions.

---

## 2. High-Level System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Web & Mobile Responsive)"]
        UI_Home["Home Landing (/)"]
        UI_Events["Event Discovery & Filters (/events)"]
        UI_Detail["Event Details & Booking Widget (/events/[id])"]
        UI_Checkout["10-Min Hold Checkout (/checkout/[holdId])"]
        UI_Tickets["Verifiable Digital Passes (/orders/[id])"]
        UI_Verify["Gate Check-in & Scanner (/tickets/verify)"]
        UI_Organizer["Organizer Analytics Hub (/organizer)"]
        UI_Admin["Admin Moderation Console (/admin)"]
    end

    subgraph AppRouterLayer ["Next.js 14 App Router Server Layer"]
        API_Auth["Auth API (/api/auth/*)"]
        API_Events["Events API (/api/events/*)"]
        API_Holds["Reservation Holds API (/api/reservations/*)"]
        API_Checkout["Checkout & Mock Gateway (/api/checkout)"]
        API_Verify["Verification API (/api/tickets/verify/*)"]
        API_Analytics["Organizer Analytics (/api/organizer/analytics)"]
        API_Admin["Admin Console API (/api/admin/*)"]
        API_Cron["Hold Expiration Worker (/api/cron/release-holds)"]
    end

    subgraph CoreEngineLayer ["Core Business Logic & Engine"]
        Engine_Reservation["10-Minute Reservation Engine\n(Row Locks & Inventory Deduction)"]
        Engine_Checkout["Checkout & Conversion Engine\n(Idempotency & Ticket Minting)"]
        Engine_Expiration["Hold Expiration & Auto-Release Service"]
        Engine_Auth["Auth Service (jose JWT + bcryptjs)"]
    end

    subgraph DatabaseLayer ["Authoritative Storage Layer (PostgreSQL 18)"]
        DB_Users[("Users")]
        DB_Orgs[("Organizations")]
        DB_Events[("Events")]
        DB_Tiers[("TicketTiers (total, sold, reserved)")]
        DB_Holds[("TicketHolds & HoldItems (10-min TTL)")]
        DB_Orders[("Orders & OrderItems")]
        DB_Payments[("PaymentTransactions")]
        DB_Tickets[("Tickets (Crypto Verification Tokens)")]
    end

    UI_Detail -->|POST /api/reservations| API_Holds
    API_Holds --> Engine_Reservation
    Engine_Reservation -->|SELECT FOR UPDATE| DB_Tiers
    Engine_Reservation --> DB_Holds

    UI_Checkout -->|POST /api/checkout| API_Checkout
    API_Checkout --> Engine_Checkout
    Engine_Checkout -->|Atomic Conversion| DB_Tiers
    Engine_Checkout --> DB_Orders
    Engine_Checkout --> DB_Payments
    Engine_Checkout --> DB_Tickets

    API_Cron --> Engine_Expiration
    Engine_Expiration -->|Release Expired Holds| DB_Holds
    Engine_Expiration -->|Decrement reservedQuantity| DB_Tiers

    UI_Verify --> API_Verify
    API_Verify --> DB_Tickets
```

---

## 3. Ten-Minute Reservation Engine Flow

```mermaid
sequenceDiagram
    autonumber
    actor Attendee
    participant Server as Next.js API (/api/reservations)
    participant DB as PostgreSQL 18
    participant Cron as Auto-Release Service

    Attendee->>Server: Request reservation (eventId, tiers, quantities)
    Server->>DB: Begin interactive transaction
    Server->>DB: Sweep stale expired holds
    Server->>DB: SELECT * FROM TicketTier WHERE id IN (...) FOR UPDATE
    Note over Server,DB: Tier rows locked; concurrent transactions queue safely
    Server->>Server: Check: requestedQuantity <= (total - sold - reserved)
    alt Insufficient Inventory
        Server->>DB: Rollback transaction
        Server-->>Attendee: 409 Conflict (Insufficient inventory)
    else Inventory Available
        Server->>DB: UPDATE TicketTier SET reservedQuantity = reservedQuantity + qty
        Server->>DB: INSERT INTO TicketHold (status=ACTIVE, expiresAt=now()+10m)
        Server->>DB: INSERT INTO TicketHoldItem (...)
        Server->>DB: Commit transaction
        Server-->>Attendee: Return holdId, expiresAt, and pricing breakdown
    end

    Note over Attendee: Attendee views 10-minute live countdown timer

    alt Attendee Completes Checkout within 10 minutes
        Attendee->>Server: Submit payment (holdId, idempotencyKey, simulation)
        Server->>DB: Begin checkout transaction with row lock on TicketHold
        Server->>Server: Verify hold is ACTIVE and not expired
        Server->>DB: Decrement reservedQuantity & Increment soldQuantity
        Server->>DB: UPDATE TicketHold SET status = CONVERTED
        Server->>DB: INSERT INTO Order (status=COMPLETED)
        Server->>DB: INSERT INTO Tickets (verificationToken, status=VALID)
        Server->>DB: Commit transaction
        Server-->>Attendee: Confirmed Order + Digital QR Tickets
    else 10 Minutes Elapse without Checkout
        Cron->>DB: Find active holds where expiresAt <= now()
        Cron->>DB: Lock hold row, UPDATE status = EXPIRED
        Cron->>DB: UPDATE TicketTier SET reservedQuantity = reservedQuantity - qty
        Note over DB: Reserved inventory safely restored for other buyers
    end
```

---

## 4. Security & Tenant Isolation

- **Authentication:** Standard JWT session encrypted via `jose` and stored in HTTP-Only, Secure, SameSite=Lax cookies (`thigazh_session`).
- **Role Model:** Distinct `ATTENDEE`, `ORGANIZER`, and `ADMIN` roles. Clients cannot promote their own roles.
- **Tenant Isolation:** All organizer queries filter by `organizationId IN (userOrganizations)`. Organizers cannot modify or view other hosts' events or bookings.
- **Idempotency:** Payment checkouts enforce unique client-supplied idempotency keys preventing double-charging or duplicate ticket minting.
- **Verification Integrity:** Digital tickets carry cryptographically unique verification tokens (`THG-XXXX-XXXX-XXXX`) and authentic QR codes verifiable at venue gates.
