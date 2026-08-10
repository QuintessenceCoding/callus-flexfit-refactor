# Domain Model

## Primary Entities

### User

Represents every authenticated person in the system.

Roles:

- Member
- Trainer
- Admin

---

### Membership Plan

Defines reusable subscription templates.

Contains:

- Price
- Duration
- Credits

---

### Membership

Represents an actual plan purchased by a member.

Tracks:

- Owner
- Remaining Credits
- Status
- Start Date
- End Date

---

### Class

Represents a scheduled fitness session.

Contains:

- Trainer
- Capacity
- Schedule
- Credit Cost

---

### Booking

Represents a member reserving a place in a class.

Tracks:

- Member
- Class
- Membership
- Booking Status
- Credits Used

---

### Company

Represents organizations participating in the corporate membership program.

---

### Corporate Booking

Represents bookings made using company credit pools.

---

### Payment

Represents financial transactions related to memberships.

Money is stored using integer cents to avoid floating-point precision issues.

---

### Notification

Represents system-generated messages sent to users.

---

### Check-in

Represents attendance at a booked class.

Supports multiple check-in sources:

- Front Desk
- Kiosk
- Mobile App

---

## High-Level Relationships

User
├── Memberships
├── Bookings
├── Notifications
├── Payments
└── Sessions

Membership
└── Membership Plan

Booking
├── User
├── Class
└── Membership

Class
└── Trainer (User)

Company
└── Company Members

Company Member
└── User

Corporate Booking
├── User
├── Company
└── Class

---

## Business Flow

User Registration
↓
Authentication
↓
Membership Purchase
↓
Payment
↓
Membership Creation
↓
Class Booking
↓
Credit Consumption
↓
Attendance
↓
Notifications