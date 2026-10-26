# THIGAZH (திகழ்) — Events That Make You Shine

> **A modern multi-tenant event discovery and ticket reservation platform built with Next.js 14 App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, and atomic inventory locks.**

---

## Overview & Identity

**THIGAZH (திகழ்)** is a premium event discovery and digital ticketing web application designed for cultural festivals, classical concerts, technology conclaves, culinary masterclasses, and creative workshops across Tamil Nadu.

### Brand Personality
- **Primary Aesthetic:** Warm ivory backgrounds (`#FAF8F5`), deep midnight plum (`#231124`), antique gold, and restrained coral accents (`#E07A5F`).
- **Typography & Polish:** Elegant serif headers, crisp modern sans typography, refined rounded cards, subtle borders, and zero decorative bloat.
- **Audience:** Event attendees, event organizers, and platform administrators.

---

## Core Highlights & Guarantees

1. **The 10-Minute Reservation Engine:**
   - Reserving tickets locks inventory for **strictly 10 minutes** with an interactive visual countdown timer.
   - Authoritative inventory check: $\text{available} = \text{totalQuantity} - \text{soldQuantity} - \text{reservedQuantity}$.
   - Unsold holds auto-expire and safely restore inventory.
2. **Zero Overselling Concurrency Guarantee:**
   - Powered by PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) in short, atomic transactions.
   - Tested and proven against simultaneous competing race conditions.
3. **Simulated Mock Payment Gateway:**
   - Supports simulated UPI, Credit/Debit cards, and Net Banking.
   - Explicit "Mock Success" and "Mock Decline" buttons to test both positive and negative financial workflows safely without collecting real card numbers.
   - Client-driven idempotency keys prevent duplicate payments and double ticket minting.
4. **Verifiable Digital Passes:**
   - Mints unique cryptographic verification tokens (e.g. `THG-XXXX-XXXX-XXXX`).
   - Generates authentic QR codes encoding live verification endpoints (`/tickets/verify?token=...`).
   - Gate scanner interface for event organizers to admit passes at the venue.
5. **Multi-Tenant Role Isolation:**
   - **Attendees:** Discover events, apply multi-criteria filters, hold tickets, checkout, view digital tickets, print passes, and browse order history.
   - **Organizers:** Manage events, configure multi-tier ticket capacities, monitor real-time revenue velocity via Recharts, and view customer order streams.
   - **Administrators:** Platform-wide oversight (GMV, total users, organizations, events) and event publishing/moderation.

---

## Technology Stack

- **Framework:** Next.js 14 (App Router, Server & Client Components)
- **Language:** TypeScript 5 (Strict Mode)
- **Styling:** Tailwind CSS (Custom ivory/plum design system)
- **Database:** PostgreSQL 18
- **ORM:** Prisma ORM 5
- **Authentication:** Encrypted JWT sessions via `jose` and `bcryptjs` with HTTP-Only cookies
- **Validation:** Zod schemas on all API inputs
- **Icons:** Lucide Icons
- **Analytics:** Recharts
- **QR Engine:** `qrcode`
- **Testing:** Vitest (Integration tests executed directly on PostgreSQL)

---

## Demo Test Accounts

The database comes pre-seeded with three distinct roles for immediate evaluation:

| Role | Email | Password | Access & Responsibilities |
|---|---|---|---|
| **Attendee** | `attendee@thigazh.com` | `Password@123` | Book passes, view `/account` & digital tickets |
| **Organizer** | `organizer@thigazh.com` | `Password@123` | Access `/organizer` hub, view analytics, publish events |
| **Administrator** | `admin@thigazh.com` | `Password@123` | Access `/admin` console, moderate events, inspect platform GMV |

*(Quick-fill buttons are conveniently available on the `/auth/signin` page for 1-click evaluation).*

---

##  Local Setup & Installation

### 1. Prerequisites
- Node.js `v18.17.0+` (Tested on Node `v24.12.0`)
- PostgreSQL (Local service, Docker, Supabase, or Neon)

### 2. Clone & Install
```bash
git clone <repository_url>
cd Train
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your PostgreSQL connection string in `.env` is accurate:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/thigazh_db?schema=public"
TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/thigazh_test_db?schema=public"
JWT_SECRET="thigazh-super-secret-jwt-key-2026-production-grade"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="thigazh-internal-cron-token-xyz"
```

### 4. Push Schema & Seed Database
```bash
# Push schema to PostgreSQL
npm run prisma:push

# Seed realistic featured events, organizations, and test users
npm run prisma:seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

##  Automated Testing Suite

THIGAZH includes comprehensive automated integration tests verifying all 15 acceptance criteria:

```bash
npm run test
```

### Verified Test Cases:
1. Valid 10-minute reservation creation & reserved inventory increment
2. Invalid quantities rejection (0, negative, > 10)
3. Insufficient inventory rejection
4. **Concurrency race condition protection:** 10 parallel requests competing for 5 tickets (exactly 5 succeed, 5 fail without overselling)
5. 10-minute hold expiration
6. Idempotent inventory release
7. Expired checkout rejection
8. Duplicate checkout prevention with idempotency keys
9. Duplicate payment callback prevention
10. Failed payment behavior (zero tickets issued, sold inventory preserved)
11. Cryptographic token minting after approved payment
12. Attendee access restriction & hold ownership checks
13. Organizer tenant isolation
14. Sales cutoff validation
15. Inventory mathematical invariant check

---

##  Production Build

```bash
# Type-check
npx tsc --noEmit

# Production build
npm run build

# Start production server
npm run start
```

---

##  Deployment Guide

### Deploying to Vercel / Railway / AWS:
1. **Database:** Provision a managed PostgreSQL instance (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or Railway PostgreSQL).
2. **Environment Variables:** In your hosting dashboard, configure:
   - `DATABASE_URL`
   - `JWT_SECRET` (generate a 32+ character random secret)
   - `NEXT_PUBLIC_APP_URL` (e.g. `https://thigazh.vercel.app`)
   - `CRON_SECRET`
3. **Database Migration:** Run `npx prisma db push` and `node prisma/seed.js` as part of your deployment build or via CLI.
4. **Hold Expiration Cron Worker:** Configure a periodic cron ping (e.g. Vercel Cron or Google Cloud Scheduler) calling `GET /api/cron/release-holds` every minute with the header `Authorization: Bearer <CRON_SECRET>`.

---

##  Project Structure

```text
├── app/
│   ├── account/page.tsx               # Attendee bookings & profile
│   ├── admin/page.tsx                 # Administrator moderation console
│   ├── api/
│   │   ├── admin/                     # Moderation & stats API
│   │   ├── auth/                      # Login, register, me, logout
│   │   ├── checkout/                  # Mock payments & order completion
│   │   ├── cron/release-holds/        # Expired hold sweeper
│   │   ├── events/                    # Discovery, creation & detail API
│   │   ├── organizer/analytics/       # Authoritative aggregates & trend
│   │   ├── reservations/              # 10-min hold creation & cancel
│   │   └── tickets/                   # Attendee passes & gate verify
│   ├── auth/
│   │   ├── signin/page.tsx            # Login with demo accounts quick-fill
│   │   └── signup/page.tsx            # Attendee & Organizer registration
│   ├── checkout/[holdId]/page.tsx     # 10-min hold countdown & checkout
│   ├── events/
│   │   ├── [id]/page.tsx              # Event detail & live booking widget
│   │   └── page.tsx                   # Event discovery with multi-filters
│   ├── orders/[id]/page.tsx           # Confirmation & printable passes
│   ├── organizer/
│   │   ├── events/new/page.tsx        # Multi-tier event builder
│   │   └── page.tsx                   # Organizer KPI cards & Recharts
│   ├── tickets/verify/page.tsx        # Gate pass verification & check-in
│   ├── globals.css                    # Warm ivory design system & print styles
│   ├── layout.tsx                     # Root responsive shell
│   └── page.tsx                       # Home landing page
├── components/
│   ├── AdminConsoleView.tsx           # Admin moderation UI
│   ├── EventBookingSection.tsx        # Interactive quantity & reserve widget
│   ├── EventCard.tsx                  # Refined card component
│   ├── Footer.tsx                     # Brand footer
│   ├── HoldCountdown.tsx              # 10-minute timer with visual thresholds
│   ├── Logo.tsx                       # Typographic THIGAZH (திகழ்) logo
│   ├── Navbar.tsx                     # Responsive navigation & mobile drawer
│   ├── OrganizerAnalyticsView.tsx     # Organizer dashboard with Recharts
│   ├── PrintTicketButton.tsx          # Clean PDF/print trigger
│   └── TicketQRCode.tsx               # Verifiable QR code generator
├── docs/
│   ├── architecture.md                # System design & sequence flows
│   ├── BUILD_STATUS.md                # Progress & verification log
│   ├── er-diagram.md                  # Normalized Mermaid ER diagram
│   ├── testing.md                     # Concurrency & test matrix
│   └── THIGAZH_Postman_Collection.json # Postman API collection
├── lib/
│   ├── auth.ts                        # JWT session management & bcrypt
│   ├── checkout.ts                    # Payment processing & ticket minting
│   ├── db.ts                          # Prisma singleton
│   ├── reservation.ts                 # 10-minute reservation engine & row locks
│   └── utils.ts                       # Currency and date formatters
├── prisma/
│   ├── schema.prisma                  # Normalized relational schema
│   └── seed.js                        # Seeding script with featured events
├── tests/
│   └── reservation-and-checkout.test.ts # 15 Vitest integration tests
└── tailwind.config.ts                 # Custom color palette & shadows
```

---

## 📄 License
MIT © THIGAZH Platform. Events That Make You Shine.
