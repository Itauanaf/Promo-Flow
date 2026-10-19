import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { Database } from "./index";
import { appSettings, auditLogs, automationRules, offers, products, publicationJobs } from "./schema";

export class OfferRepository {
  constructor(private readonly db: Database) {}
  listRecent(limit = 50) {
    return this.db.select({ offer: offers, product: products }).from(offers).innerJoin(products, eq(offers.productId, products.id)).orderBy(desc(offers.capturedAt)).limit(Math.min(limit, 100));
  }
}

export class PublicationJobRepository {
  constructor(private readonly db: Database) {}
  create(input: typeof publicationJobs.$inferInsert) {
    return this.db.insert(publicationJobs).values(input).onConflictDoNothing({ target: publicationJobs.idempotencyKey }).returning();
  }
  claimReady(now: Date, limit = 20) {
    return this.db.select().from(publicationJobs).where(and(eq(publicationJobs.status, "waiting"), lte(publicationJobs.scheduledAt, now))).orderBy(publicationJobs.scheduledAt).limit(Math.min(limit, 100));
  }
}

export class AuditRepository {
  constructor(private readonly db: Database) {}
  record(entry: typeof auditLogs.$inferInsert) {
    return this.db.insert(auditLogs).values(entry).returning({ id: auditLogs.id });
  }
}

export class AutomationRuleRepository {
  constructor(private readonly db: Database) {}
  listActive() { return this.db.select().from(automationRules).where(sql`${automationRules.deletedAt} is null`).orderBy(automationRules.name); }
  create(input: typeof automationRules.$inferInsert) { return this.db.insert(automationRules).values(input).returning(); }
  update(id: string, input: Partial<Omit<typeof automationRules.$inferInsert, "id" | "createdAt">>) { return this.db.update(automationRules).set({ ...input, version: sql`${automationRules.version} + 1`, updatedAt: new Date() }).where(and(eq(automationRules.id, id), sql`${automationRules.deletedAt} is null`)).returning(); }
  setEnabled(id: string, enabled: boolean) { return this.update(id, { enabled }); }
  softDelete(id: string) { return this.db.update(automationRules).set({ enabled: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(automationRules.id, id)).returning(); }
}

export class AutomationControlRepository {
  constructor(private readonly db: Database) {}
  setGlobalEnabled(ownerId: string, enabled: boolean) { return this.db.update(appSettings).set({ automationEnabled: enabled, updatedAt: new Date() }).where(eq(appSettings.ownerId, ownerId)).returning(); }
  async isGlobalEnabled(ownerId: string) { const [settings] = await this.db.select({ enabled: appSettings.automationEnabled }).from(appSettings).where(eq(appSettings.ownerId, ownerId)).limit(1); return settings?.enabled ?? false; }
}
