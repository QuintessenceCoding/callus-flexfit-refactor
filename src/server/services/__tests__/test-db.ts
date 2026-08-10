import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { db as appDb } from "@/db";
import {
  bookings,
  classes,
  companies,
  companyMembers,
  corporateBookings,
  membershipPlans,
  memberships,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";

export type TestDb = typeof appDb;

let sequence = 0;

export function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function dateOnlyFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export async function createTestDb(): Promise<TestDb> {
  const client = createClient({ url: "file::memory:" });
  await createTables(client);
  return drizzle(client, { schema });
}

export async function createUser(
  db: TestDb,
  values: Partial<typeof users.$inferInsert> = {},
) {
  sequence += 1;
  return db
    .insert(users)
    .values({
      email: `member-${sequence}@example.com`,
      passwordHash: "test-hash",
      name: `Member ${sequence}`,
      role: "member",
      ...values,
    })
    .returning()
    .get();
}

export async function createMembershipPlan(
  db: TestDb,
  values: Partial<typeof membershipPlans.$inferInsert> = {},
) {
  sequence += 1;
  return db
    .insert(membershipPlans)
    .values({
      name: `Plan ${sequence}`,
      priceCents: 1000,
      durationDays: 30,
      classCredits: 10,
      ...values,
    })
    .returning()
    .get();
}

export async function createMembership(
  db: TestDb,
  values: Omit<Partial<typeof memberships.$inferInsert>, "userId" | "planId"> & {
    userId: number;
    planId?: number;
  },
) {
  const { userId, planId: providedPlanId, ...membershipValues } = values;
  const planId = providedPlanId ?? (await createMembershipPlan(db)).id;
  return db
    .insert(memberships)
    .values({
      userId,
      planId,
      startDate: dateOnlyFromNow(-1),
      endDate: dateOnlyFromNow(30),
      creditsRemaining: 10,
      status: "active",
      ...membershipValues,
    })
    .returning()
    .get();
}

export async function createClass(
  db: TestDb,
  values: Partial<typeof classes.$inferInsert> = {},
) {
  sequence += 1;
  return db
    .insert(classes)
    .values({
      name: `Class ${sequence}`,
      room: "Studio A",
      capacity: 10,
      startsAt: hoursFromNow(48),
      durationMin: 60,
      creditCost: 2,
      cancelled: false,
      ...values,
    })
    .returning()
    .get();
}

export async function createBooking(
  db: TestDb,
  values: typeof bookings.$inferInsert,
) {
  return db.insert(bookings).values(values).returning().get();
}

export async function createCompany(
  db: TestDb,
  values: Partial<typeof companies.$inferInsert> = {},
) {
  sequence += 1;
  return db
    .insert(companies)
    .values({
      name: `Company ${sequence}`,
      contactEmail: `company-${sequence}@example.com`,
      creditPoolBalance: 10,
      active: true,
      ...values,
    })
    .returning()
    .get();
}

export async function createCompanyMember(
  db: TestDb,
  values: typeof companyMembers.$inferInsert,
) {
  return db.insert(companyMembers).values(values).returning().get();
}

export async function createCorporateBooking(
  db: TestDb,
  values: typeof corporateBookings.$inferInsert,
) {
  return db.insert(corporateBookings).values(values).returning().get();
}

async function createTables(client: ReturnType<typeof createClient>) {
  const statements = [
    `CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      duration_days INTEGER NOT NULL,
      class_credits INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      credits_remaining INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      trainer_id INTEGER,
      room TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      starts_at TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 60,
      credit_cost INTEGER NOT NULL DEFAULT 1,
      cancelled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      membership_id INTEGER,
      status TEXT NOT NULL DEFAULT 'booked',
      credits_used INTEGER NOT NULL DEFAULT 0,
      booked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cancelled_at TEXT
    )`,
    `CREATE TABLE checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source TEXT NOT NULL DEFAULT 'front_desk'
    )`,
    `CREATE TABLE companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      credit_pool_balance INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE company_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE corporate_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked',
      credits_used INTEGER NOT NULL DEFAULT 0,
      booked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cancelled_at TEXT
    )`,
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }
}
