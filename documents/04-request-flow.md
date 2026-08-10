# Request Flow

## High-Level Request Lifecycle

User Action
↓
React Component
↓
React Query
↓
tRPC Client
↓
App Router
↓
Procedure
↓
Authorization Middleware
↓
Business Logic
↓
Drizzle ORM
↓
SQLite Database
↓
Response
↓
React UI Update

---

## Authentication Flow

Browser Cookie
↓
Session Token
↓
createContext()
↓
Sessions Table
↓
Users Table
↓
Authenticated User
↓
Procedure Execution

---

## Booking Flow

User clicks "Book"

↓

bookings.book()

↓

Validate class

↓

Validate membership

↓

Validate credits

↓

Check duplicate booking

↓

Check class capacity

↓

Booked
OR
Waitlisted

↓

Deduct credits (only for confirmed bookings)

↓

Return booking