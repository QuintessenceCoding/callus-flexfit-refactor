import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db as database } from "@/db";
import {
  bookings,
  classes,
  checkins,
  memberships,
  users,
  type Booking,
  type GymClass,
} from "@/db/schema";

type Db = typeof database;

type BookingWithClass = {
  booking: Booking;
  cls: GymClass;
};

/**
 * Members may cancel free of charge up to this many hours before the class
 * starts. Cancelling later still frees the spot but forfeits the credit.
 */
export const FREE_CANCELLATION_HOURS = 12;

/** Plans with this many credits are treated as unlimited and never decrement. */
export const UNLIMITED_CREDITS = 999;

function hoursUntil(iso: string, now = new Date()): number {
  return (new Date(iso).getTime() - now.getTime()) / 36e5;
}

export class BookingService {
  constructor(private readonly db: Db) {}

  async listMine(userId: number, includePast: boolean) {
    const rows = await this.db
      .select({
        id: bookings.id,
        status: bookings.status,
        creditsUsed: bookings.creditsUsed,
        bookedAt: bookings.bookedAt,
        classId: classes.id,
        className: classes.name,
        room: classes.room,
        startsAt: classes.startsAt,
        durationMin: classes.durationMin,
        cancelled: classes.cancelled,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .where(eq(bookings.userId, userId))
      .orderBy(asc(classes.startsAt));

    const now = new Date();
    return rows.filter((r) =>
      includePast ? true : new Date(r.startsAt) >= now,
    );
  }

  async bookClass(userId: number, classId: number) {
    const cls = await this.db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .get();

    if (!cls) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
    }
    if (cls.cancelled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This class has been cancelled.",
      });
    }
    if (hoursUntil(cls.startsAt) <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This class has already started.",
      });
    }

    const existing = await this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.classId, cls.id),
          eq(bookings.userId, userId),
          inArray(bookings.status, ["booked", "waitlisted"]),
        ),
      )
      .get();

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You are already on the list for this class.",
      });
    }

    const membership = await this.activeMembershipFor(userId);
    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "An active membership is required to book classes.",
      });
    }

    const unlimited = membership.creditsRemaining >= UNLIMITED_CREDITS;
    if (!unlimited && membership.creditsRemaining < cls.creditCost) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not enough class credits remaining.",
      });
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(eq(bookings.classId, cls.id), eq(bookings.status, "booked")),
      );

    const isFull = Number(count) >= cls.capacity;

    const created = await this.db
      .insert(bookings)
      .values({
        classId: cls.id,
        userId,
        membershipId: membership.id,
        status: isFull ? "waitlisted" : "booked",
        creditsUsed: isFull ? 0 : cls.creditCost,
      })
      .returning()
      .get();

    if (!isFull && !unlimited) {
      await this.db
        .update(memberships)
        .set({ creditsRemaining: membership.creditsRemaining - cls.creditCost })
        .where(eq(memberships.id, membership.id));
    }

    return created;
  }

  async getBookingWithClass(bookingId: number) {
    const row = await this.db
      .select({ booking: bookings, cls: classes })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .where(eq(bookings.id, bookingId))
      .get();

    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
    }

    return row;
  }

  async cancelBooking(row: BookingWithClass) {
    if (row.booking.status !== "booked" && row.booking.status !== "waitlisted") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This booking is no longer active.",
      });
    }

    const refundable =
      hoursUntil(row.cls.startsAt) >= FREE_CANCELLATION_HOURS &&
      row.booking.creditsUsed > 0;

    await this.db
      .update(bookings)
      .set({ status: "cancelled", cancelledAt: new Date().toISOString() })
      .where(eq(bookings.id, row.booking.id));

    if (refundable && row.booking.membershipId) {
      const ms = await this.db
        .select()
        .from(memberships)
        .where(eq(memberships.id, row.booking.membershipId))
        .get();

      if (ms && ms.creditsRemaining < UNLIMITED_CREDITS) {
        await this.db
          .update(memberships)
          .set({ creditsRemaining: ms.creditsRemaining + row.booking.creditsUsed })
          .where(eq(memberships.id, ms.id));
      }
    }

    // Freeing a confirmed spot promotes the member who has waited longest.
    if (row.booking.status === "booked") {
      const next = await this.db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.classId, row.cls.id),
            eq(bookings.status, "waitlisted"),
          ),
        )
        .orderBy(asc(bookings.bookedAt))
        .get();

      if (next) {
        await this.db
          .update(bookings)
          .set({ status: "booked", creditsUsed: row.cls.creditCost })
          .where(eq(bookings.id, next.id));

        if (next.membershipId) {
          const ms = await this.db
            .select()
            .from(memberships)
            .where(eq(memberships.id, next.membershipId))
            .get();

          if (ms && ms.creditsRemaining < UNLIMITED_CREDITS) {
            await this.db
              .update(memberships)
              .set({
                creditsRemaining: Math.max(
                  0,
                  ms.creditsRemaining - row.cls.creditCost,
                ),
              })
              .where(eq(memberships.id, ms.id));
          }
        }
      }
    }

    return { ok: true, refunded: refundable };
  }

  async markAttended(
    bookingId: number,
    source: "front_desk" | "kiosk" | "app",
  ) {
    const booking = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .get();

    if (!booking) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
    }
    if (booking.status !== "booked") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only confirmed bookings can be checked in.",
      });
    }

    await this.db
      .update(bookings)
      .set({ status: "attended" })
      .where(eq(bookings.id, booking.id));

    await this.db.insert(checkins).values({
      userId: booking.userId,
      bookingId: booking.id,
      source,
    });

    return { ok: true };
  }

  listRosterForClass(classId: number) {
    return this.db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        memberId: users.id,
        memberName: users.name,
        memberEmail: users.email,
        bookedAt: bookings.bookedAt,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.classId, classId))
      .orderBy(asc(bookings.bookedAt));
  }

  listUpcomingForMember(userId: number, hoursAhead: number) {
    const now = new Date().toISOString();
    const futureTime = new Date(
      Date.now() + hoursAhead * 60 * 60 * 1000,
    ).toISOString();

    return this.db
      .select({
        bookingId: bookings.id,
        bookingStatus: bookings.status,
        classId: classes.id,
        className: classes.name,
        room: classes.room,
        startsAt: classes.startsAt,
        durationMin: classes.durationMin,
        capacity: classes.capacity,
        trainerId: classes.trainerId,
        trainerName: users.name,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .leftJoin(users, eq(classes.trainerId, users.id))
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.status, "booked"),
          sql`${classes.startsAt} >= ${now}`,
          sql`${classes.startsAt} <= ${futureTime}`,
          eq(classes.cancelled, false),
        ),
      )
      .orderBy(classes.startsAt);
  }

  async checkinCountForClass(classId: number) {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(checkins)
      .innerJoin(bookings, eq(checkins.bookingId, bookings.id))
      .where(eq(bookings.classId, classId));

    return { count: Number(result?.count ?? 0) };
  }

  async listWaitlistedForUser(userId: number) {
    const waitlistedBookings = await this.db
      .select({
        bookingId: bookings.id,
        classId: classes.id,
        className: classes.name,
        room: classes.room,
        startsAt: classes.startsAt,
        durationMin: classes.durationMin,
        capacity: classes.capacity,
        bookedAt: bookings.bookedAt,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .where(
        and(eq(bookings.userId, userId), eq(bookings.status, "waitlisted")),
      )
      .orderBy(asc(classes.startsAt));

    const result = await Promise.all(
      waitlistedBookings.map(async (wb) => {
        const [{ position }] = await this.db
          .select({ position: sql<number>`count(*)` })
          .from(bookings)
          .where(
            and(
              eq(bookings.classId, wb.classId),
              eq(bookings.status, "waitlisted"),
              sql`${bookings.bookedAt} < ${wb.bookedAt}`,
            ),
          );

        return {
          ...wb,
          position: Number(position) + 1,
        };
      }),
    );

    return result;
  }

  private activeMembershipFor(userId: number) {
    const today = new Date().toISOString().slice(0, 10);
    return this.db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.status, "active"),
          sql`${memberships.endDate} >= ${today}`,
        ),
      )
      .orderBy(desc(memberships.endDate))
      .get();
  }
}
