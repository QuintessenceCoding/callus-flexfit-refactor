# Product Overview

## Purpose

FlexFit Studio is a gym management platform designed to manage the day-to-day operations of a fitness studio. The application supports multiple user roles and provides functionality for membership management, class bookings, attendance tracking, corporate memberships, trainer scheduling, and administrative reporting.

The project appears to simulate a production application that has evolved over time, with multiple interconnected business domains.

---

## User Roles

### Member

Members can:

- Sign in
- View dashboard
- Browse class schedule
- Book classes
- Cancel bookings
- Join waitlists
- Purchase membership plans
- View notifications

---

### Trainer

Trainers can:

- View personal schedule
- Access trainer-specific pages
- Participate in attendance-related workflows

---

### Administrator

Administrators can:

- Manage companies
- View reports
- Manage announcements
- Monitor attendance
- Access revenue information
- Perform administrative operations

---

### Front Desk / Kiosk

The application also provides a kiosk mode that appears to support member lookup and check-in functionality for reception staff.

---

## Core Business Domains

- User Management
- Authentication
- Membership Management
- Class Scheduling
- Class Bookings
- Payments
- Attendance Tracking
- Notifications
- Corporate Memberships
- Administrative Reporting

---

## Initial Observations

- The application is feature complete and business-oriented.
- The project uses role-based access control.
- Corporate memberships are treated separately from individual memberships.
- Most business functionality revolves around bookings and memberships.
- The Schedule page currently remains in a perpetual loading state during exploration. This has been documented as a pre-existing observation and has not yet been investigated.

---

## Exploration Status

| Area | Status |
|-------|--------|
| UI Exploration | ✅ Complete |
| Database Schema | ✅ Complete |
| Backend Architecture | ✅ Complete |
| Feature Tracing | ⏳ Pending |
| Refactoring | ⏳ Pending |