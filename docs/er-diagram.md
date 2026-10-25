# THIGAZH (திகழ்) — Entity Relationship Diagram

This document illustrates the normalized relational database schema powering THIGAZH.

```mermaid
erDiagram
    USER ||--o{ ORGANIZATION : "owns"
    USER ||--o{ TICKET_HOLD : "reserves"
    USER ||--o{ ORDER : "places"
    USER ||--o{ TICKET : "holds"

    ORGANIZATION ||--o{ EVENT : "hosts"

    EVENT ||--o{ TICKET_TIER : "offers"
    EVENT ||--o{ TICKET_HOLD : "has_active_holds"
    EVENT ||--o{ ORDER : "generates"

    TICKET_TIER ||--o{ TICKET_HOLD_ITEM : "held_in"
    TICKET_TIER ||--o{ ORDER_ITEM : "ordered_in"
    TICKET_TIER ||--o{ TICKET : "instantiates"

    TICKET_HOLD ||--|{ TICKET_HOLD_ITEM : "contains"
    TICKET_HOLD ||--o| ORDER : "converts_to"

    ORDER ||--|{ ORDER_ITEM : "includes"
    ORDER ||--|{ PAYMENT_TRANSACTION : "processed_by"

    ORDER_ITEM ||--|{ TICKET : "issues"

    USER {
        uuid id PK
        string email UK
        string name
        string passwordHash
        enum role "ATTENDEE | ORGANIZER | ADMIN"
        datetime createdAt
        datetime updatedAt
    }

    ORGANIZATION {
        uuid id PK
        string name
        string slug UK
        uuid ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    EVENT {
        uuid id PK
        uuid organizationId FK
        string title
        string slug UK
        text description
        string category
        string venue
        string city
        datetime startAt
        datetime endAt
        datetime salesStartAt
        datetime salesCutoffAt
        enum status "DRAFT | PUBLISHED | CANCELLED | COMPLETED"
        string coverImage
        datetime createdAt
        datetime updatedAt
    }

    TICKET_TIER {
        uuid id PK
        uuid eventId FK
        string name
        string description
        int price "in paise (e.g. 49900 = Rs 499)"
        string currency "INR"
        int totalQuantity
        int soldQuantity
        int reservedQuantity
        datetime createdAt
        datetime updatedAt
    }

    TICKET_HOLD {
        uuid id PK
        uuid userId FK
        uuid eventId FK
        enum status "ACTIVE | EXPIRED | CONVERTED | RELEASED"
        datetime expiresAt "Exactly 10 minutes from creation"
        datetime createdAt
        datetime updatedAt
    }

    TICKET_HOLD_ITEM {
        uuid id PK
        uuid holdId FK
        uuid ticketTierId FK
        int quantity
        int unitPrice
    }

    ORDER {
        uuid id PK
        string orderNumber UK
        uuid userId FK
        uuid eventId FK
        uuid holdId FK
        enum status "PENDING | COMPLETED | CANCELLED | REFUNDED"
        int totalAmount
        string currency "INR"
        string idempotencyKey UK
        datetime createdAt
        datetime updatedAt
    }

    ORDER_ITEM {
        uuid id PK
        uuid orderId FK
        uuid ticketTierId FK
        int quantity
        int unitPrice
    }

    PAYMENT_TRANSACTION {
        uuid id PK
        uuid orderId FK
        string paymentReference UK
        string idempotencyKey UK
        int amount
        string currency "INR"
        enum status "PENDING | APPROVED | REJECTED | FAILED"
        text gatewayResponse
        datetime createdAt
        datetime processedAt
    }

    TICKET {
        uuid id PK
        uuid orderItemId FK
        uuid ticketTierId FK
        uuid userId FK
        string verificationToken UK "e.g. THG-XXXX-XXXX-XXXX"
        enum status "VALID | USED | CANCELLED"
        datetime issuedAt
        datetime usedAt
    }
```

## Inventory Invariant
For every ticket tier in the database:
$$\text{available} = \text{totalQuantity} - \text{soldQuantity} - \text{reservedQuantity}$$
This invariant is strictly enforced at the database layer via interactive PostgreSQL transactions and row-level locking (`SELECT ... FOR UPDATE`).
