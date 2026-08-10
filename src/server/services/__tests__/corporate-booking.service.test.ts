import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { companies, corporateBookings } from "@/db/schema";
import { CorporateBookingService } from "../corporate-booking.service";
import {
  createCompany,
  createCompanyMember,
  createCorporateBooking,
  createClass,
  createTestDb,
  createUser,
  hoursFromNow,
  type TestDb,
} from "./test-db";

describe("CorporateBookingService", () => {
  let db: TestDb;
  let service: CorporateBookingService;

  beforeEach(async () => {
    db = await createTestDb();
    service = new CorporateBookingService(db);
  });

  it("books a class using an active company credit pool", async () => {
    const member = await createUser(db);
    const company = await createCompany(db, { creditPoolBalance: 10 });
    await createCompanyMember(db, { userId: member.id, companyId: company.id });
    const cls = await createClass(db, { creditCost: 3 });

    const booking = await service.bookClass(member.id, cls.id);

    expect(booking).toMatchObject({
      classId: cls.id,
      userId: member.id,
      companyId: company.id,
      status: "booked",
      creditsUsed: 3,
    });

    const updatedCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.id, company.id))
      .get();
    expect(updatedCompany?.creditPoolBalance).toBe(7);
  });

  it("rejects booking without an active company link", async () => {
    const member = await createUser(db);
    const inactiveCompany = await createCompany(db, { active: false });
    await createCompanyMember(db, {
      userId: member.id,
      companyId: inactiveCompany.id,
    });
    const cls = await createClass(db);

    await expect(service.bookClass(member.id, cls.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You are not linked to an active company.",
    } satisfies Partial<TRPCError>);
  });

  it("rejects booking when the company credit pool is insufficient", async () => {
    const member = await createUser(db);
    const company = await createCompany(db, { creditPoolBalance: 1 });
    await createCompanyMember(db, { userId: member.id, companyId: company.id });
    const cls = await createClass(db, { creditCost: 2 });

    await expect(service.bookClass(member.id, cls.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Your company does not have enough credits.",
    } satisfies Partial<TRPCError>);
  });

  it("restores company credits for eligible cancellations", async () => {
    const member = await createUser(db);
    const company = await createCompany(db, { creditPoolBalance: 5 });
    await createCompanyMember(db, { userId: member.id, companyId: company.id });
    const cls = await createClass(db, {
      startsAt: hoursFromNow(30),
      creditCost: 2,
    });
    const booking = await createCorporateBooking(db, {
      classId: cls.id,
      userId: member.id,
      companyId: company.id,
      status: "booked",
      creditsUsed: 2,
    });

    const result = await service.cancelBooking(
      await service.getBookingWithClass(booking.id),
    );

    expect(result).toEqual({ ok: true, refunded: true });

    const updatedCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.id, company.id))
      .get();
    expect(updatedCompany?.creditPoolBalance).toBe(7);
  });

  it("deducts the promoted member company credits during waitlist promotion", async () => {
    const confirmedMember = await createUser(db);
    const confirmedCompany = await createCompany(db, { creditPoolBalance: 5 });
    await createCompanyMember(db, {
      userId: confirmedMember.id,
      companyId: confirmedCompany.id,
    });
    const waitlistedMember = await createUser(db);
    const waitlistedCompany = await createCompany(db, { creditPoolBalance: 5 });
    await createCompanyMember(db, {
      userId: waitlistedMember.id,
      companyId: waitlistedCompany.id,
    });
    const cls = await createClass(db, {
      capacity: 1,
      creditCost: 2,
      startsAt: hoursFromNow(30),
    });
    const confirmedBooking = await createCorporateBooking(db, {
      classId: cls.id,
      userId: confirmedMember.id,
      companyId: confirmedCompany.id,
      status: "booked",
      creditsUsed: 2,
      bookedAt: "2026-01-01T09:00:00.000Z",
    });
    const waitlistedBooking = await createCorporateBooking(db, {
      classId: cls.id,
      userId: waitlistedMember.id,
      companyId: waitlistedCompany.id,
      status: "waitlisted",
      creditsUsed: 0,
      bookedAt: "2026-01-01T10:00:00.000Z",
    });

    await service.cancelBooking(
      await service.getBookingWithClass(confirmedBooking.id),
    );

    const promoted = await db
      .select()
      .from(corporateBookings)
      .where(eq(corporateBookings.id, waitlistedBooking.id))
      .get();
    expect(promoted).toMatchObject({ status: "booked", creditsUsed: 2 });

    const promotedCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.id, waitlistedCompany.id))
      .get();
    expect(promotedCompany?.creditPoolBalance).toBe(3);
  });
});
