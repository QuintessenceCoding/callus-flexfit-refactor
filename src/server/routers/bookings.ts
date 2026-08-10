import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  BookingService,
  FREE_CANCELLATION_HOURS,
  UNLIMITED_CREDITS,
} from "../services/booking.service";
import { protectedProcedure, router, staffProcedure } from "../trpc";

export { FREE_CANCELLATION_HOURS, UNLIMITED_CREDITS };

export const bookingsRouter = router({
  mine: protectedProcedure
    .input(z.object({ includePast: z.boolean().default(false) }).default({}))
    .query(async ({ ctx, input }) => {
      const bookingService = new BookingService(ctx.db);

      return bookingService.listMine(ctx.user.id, input.includePast);
    }),

  book: protectedProcedure
    .input(z.object({ classId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const bookingService = new BookingService(ctx.db);

      return bookingService.bookClass(ctx.user.id, input.classId);
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const bookingService = new BookingService(ctx.db);

      const row = await bookingService.getBookingWithClass(input.bookingId);

      const isOwner = row.booking.userId === ctx.user.id;
      const isStaff =
        ctx.user.role === "admin" || ctx.user.role === "trainer";

      if (!isOwner && !isStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot cancel this booking.",
        });
      }

      return bookingService.cancelBooking(row);
    }),

  markAttended: staffProcedure
    .input(
      z.object({
        bookingId: z.number(),
        source: z
          .enum(["front_desk", "kiosk", "app"])
          .default("front_desk"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bookingService = new BookingService(ctx.db);

      return bookingService.markAttended(
        input.bookingId,
        input.source,
      );
    }),

  rosterFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      const bookingService = new BookingService(ctx.db);

      return bookingService.listRosterForClass(input.classId);
    }),

  upcomingForMember: staffProcedure
    .input(
      z.object({
        userId: z.number(),
        hoursAhead: z.number().default(2),
      }),
    )
    .query(async ({ ctx, input }) => {
      const bookingService = new BookingService(ctx.db);

      return bookingService.listUpcomingForMember(
        input.userId,
        input.hoursAhead,
      );
    }),

  checkinCountFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      const bookingService = new BookingService(ctx.db);

      return bookingService.checkinCountForClass(input.classId);
    }),

  waitlisted: protectedProcedure.query(async ({ ctx }) => {
    const bookingService = new BookingService(ctx.db);

    return bookingService.listWaitlistedForUser(ctx.user.id);
  }),
});