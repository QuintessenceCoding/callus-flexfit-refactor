import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  CorporateBookingService,
  CORPORATE_FREE_CANCELLATION_HOURS,
} from "../services/corporate-booking.service";
import { protectedProcedure, router, staffProcedure } from "../trpc";

export { CORPORATE_FREE_CANCELLATION_HOURS };

export const corporateBookingsRouter = router({
  mine: protectedProcedure
    .input(z.object({ includePast: z.boolean().default(false) }).default({}))
    .query(async ({ ctx, input }) => {
      const service = new CorporateBookingService(ctx.db);
      return service.listMine(ctx.user.id, input.includePast);
    }),

  book: protectedProcedure
    .input(z.object({ classId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const service = new CorporateBookingService(ctx.db);
      return service.bookClass(ctx.user.id, input.classId);
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const service = new CorporateBookingService(ctx.db);
      const row = await service.getBookingWithClass(input.bookingId);

      const isOwner = row.booking.userId === ctx.user.id;
      const isStaff = ctx.user.role === "admin" || ctx.user.role === "trainer";
      if (!isOwner && !isStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot cancel this booking.",
        });
      }

      return service.cancelBooking(row);
    }),

  markAttended: staffProcedure
    .input(
      z.object({
        bookingId: z.number(),
        source: z.enum(["front_desk", "kiosk", "app"]).default("front_desk"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new CorporateBookingService(ctx.db);
      return service.markAttended(input.bookingId);
    }),

  rosterFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      const service = new CorporateBookingService(ctx.db);
      return service.listRosterForClass(input.classId);
    }),
});
