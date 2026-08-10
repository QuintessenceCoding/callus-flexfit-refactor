import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { bookings, checkins, memberships } from "@/db/schema";
import { BookingService } from "../booking.service";
import {
  createBooking,
  createClass,
  createMembership,
  createTestDb,
  createUser,
  hoursFromNow,
  type TestDb,
} from "./test-db";

describe("BookingService", () => {
  let db: TestDb;
  let service: BookingService;

  beforeEach(async () => {
    db = await createTestDb();
    service = new BookingService(db);
  });

  it("books a class for a member with a valid membership and deducts credits", async () => {
    const member = await createUser(db);
    const membership = await createMembership(db, {
      userId: member.id,
      creditsRemaining: 5,
    });
    const cls = await createClass(db, { creditCost: 2 });

    const booking = await service.bookClass(member.id, cls.id);

    expect(booking).toMatchObject({
      classId: cls.id,
      userId: member.id,
      membershipId: membership.id,
      status: "booked",
      creditsUsed: 2,
    });

    const updatedMembership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membership.id))
      .get();
    expect(updatedMembership?.creditsRemaining).toBe(3);
  });

  it("rejects duplicate active bookings for the same class", async () => {
    const member = await createUser(db);
    await createMembership(db, { userId: member.id });
    const cls = await createClass(db);
    await service.bookClass(member.id, cls.id);

    await expect(service.bookClass(member.id, cls.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "You are already on the list for this class.",
    } satisfies Partial<TRPCError>);
  });

  it("rejects booking a cancelled class", async () => {
    const member = await createUser(db);
    await createMembership(db, { userId: member.id });
    const cls = await createClass(db, { cancelled: true });

    await expect(service.bookClass(member.id, cls.id)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This class has been cancelled.",
    } satisfies Partial<TRPCError>);
  });

  it("rejects booking after the class has started", async () => {
    const member = await createUser(db);
    await createMembership(db, { userId: member.id });
    const cls = await createClass(db, { startsAt: hoursFromNow(-1) });

    await expect(service.bookClass(member.id, cls.id)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This class has already started.",
    } satisfies Partial<TRPCError>);
  });

  it("rejects booking without an active membership", async () => {
    const member = await createUser(db);
    const cls = await createClass(db);

    await expect(service.bookClass(member.id, cls.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "An active membership is required to book classes.",
    } satisfies Partial<TRPCError>);
  });

  it("rejects booking when membership credits are insufficient", async () => {
    const member = await createUser(db);
    await createMembership(db, { userId: member.id, creditsRemaining: 1 });
    const cls = await createClass(db, { creditCost: 2 });

    await expect(service.bookClass(member.id, cls.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Not enough class credits remaining.",
    } satisfies Partial<TRPCError>);
  });

  it("creates a waitlist entry without deducting credits when the class is full", async () => {
    const confirmedMember = await createUser(db);
    const confirmedMembership = await createMembership(db, {
      userId: confirmedMember.id,
    });
    const waitlistedMember = await createUser(db);
    const waitlistedMembership = await createMembership(db, {
      userId: waitlistedMember.id,
      creditsRemaining: 5,
    });
    const cls = await createClass(db, { capacity: 1, creditCost: 2 });

    await createBooking(db, {
      classId: cls.id,
      userId: confirmedMember.id,
      membershipId: confirmedMembership.id,
      status: "booked",
      creditsUsed: 2,
    });

    const booking = await service.bookClass(waitlistedMember.id, cls.id);

    expect(booking.status).toBe("waitlisted");
    expect(booking.creditsUsed).toBe(0);

    const membership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, waitlistedMembership.id))
      .get();
    expect(membership?.creditsRemaining).toBe(5);
  });

  it("refunds credits for eligible cancellations", async () => {
    const member = await createUser(db);
    const membership = await createMembership(db, {
      userId: member.id,
      creditsRemaining: 3,
    });
    const cls = await createClass(db, {
      startsAt: hoursFromNow(24),
      creditCost: 2,
    });
    const booking = await createBooking(db, {
      classId: cls.id,
      userId: member.id,
      membershipId: membership.id,
      status: "booked",
      creditsUsed: 2,
    });

    const result = await service.cancelBooking(
      await service.getBookingWithClass(booking.id),
    );

    expect(result).toEqual({ ok: true, refunded: true });

    const updatedMembership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membership.id))
      .get();
    expect(updatedMembership?.creditsRemaining).toBe(5);
  });

  it("does not refund credits for late cancellations", async () => {
    const member = await createUser(db);
    const membership = await createMembership(db, {
      userId: member.id,
      creditsRemaining: 3,
    });
    const cls = await createClass(db, {
      startsAt: hoursFromNow(6),
      creditCost: 2,
    });
    const booking = await createBooking(db, {
      classId: cls.id,
      userId: member.id,
      membershipId: membership.id,
      status: "booked",
      creditsUsed: 2,
    });

    const result = await service.cancelBooking(
      await service.getBookingWithClass(booking.id),
    );

    expect(result).toEqual({ ok: true, refunded: false });

    const updatedMembership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membership.id))
      .get();
    expect(updatedMembership?.creditsRemaining).toBe(3);
  });

  it("promotes the longest-waiting member after a confirmed booking is cancelled", async () => {
    const confirmedMember = await createUser(db);
    const confirmedMembership = await createMembership(db, {
      userId: confirmedMember.id,
      creditsRemaining: 3,
    });
    const waitlistedMember = await createUser(db);
    const waitlistedMembership = await createMembership(db, {
      userId: waitlistedMember.id,
      creditsRemaining: 5,
    });
    const cls = await createClass(db, {
      capacity: 1,
      creditCost: 2,
      startsAt: hoursFromNow(24),
    });
    const confirmedBooking = await createBooking(db, {
      classId: cls.id,
      userId: confirmedMember.id,
      membershipId: confirmedMembership.id,
      status: "booked",
      creditsUsed: 2,
      bookedAt: "2026-01-01T09:00:00.000Z",
    });
    const waitlistedBooking = await createBooking(db, {
      classId: cls.id,
      userId: waitlistedMember.id,
      membershipId: waitlistedMembership.id,
      status: "waitlisted",
      creditsUsed: 0,
      bookedAt: "2026-01-01T10:00:00.000Z",
    });

    await service.cancelBooking(
      await service.getBookingWithClass(confirmedBooking.id),
    );

    const promoted = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, waitlistedBooking.id))
      .get();
    expect(promoted).toMatchObject({ status: "booked", creditsUsed: 2 });

    const promotedMembership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, waitlistedMembership.id))
      .get();
    expect(promotedMembership?.creditsRemaining).toBe(3);
  });

  it("marks confirmed bookings attended and records the check-in source", async () => {
    const member = await createUser(db);
    const membership = await createMembership(db, { userId: member.id });
    const cls = await createClass(db);
    const booking = await createBooking(db, {
      classId: cls.id,
      userId: member.id,
      membershipId: membership.id,
      status: "booked",
      creditsUsed: 2,
    });

    await service.markAttended(booking.id, "kiosk");

    const updatedBooking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, booking.id))
      .get();
    expect(updatedBooking?.status).toBe("attended");

    const checkin = await db
      .select()
      .from(checkins)
      .where(eq(checkins.bookingId, booking.id))
      .get();
    expect(checkin).toMatchObject({
      userId: member.id,
      bookingId: booking.id,
      source: "kiosk",
    });
  });
});
