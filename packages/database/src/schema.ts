import { boolean, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const storeEnum = pgEnum("store", ["shopee", "amazon", "mercado_livre", "aliexpress"]);
export const platformEnum = pgEnum("messaging_platform", ["telegram", "whatsapp"]);
export const integrationStatusEnum = pgEnum("integration_status", ["not_configured", "pending", "available", "unavailable"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const jobStatusEnum = pgEnum("job_status", ["waiting", "processing", "published", "failed", "cancelled", "unknown"]);
export const approvalModeEnum = pgEnum("approval_mode", ["manual", "semi_automatic", "automatic"]);

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: createdAt(), updatedAt: updatedAt(),
});

export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("America/Recife"),
  defaultCurrency: text("default_currency").notNull().default("BRL"),
  automationEnabled: boolean("automation_enabled").notNull().default(false),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("app_settings_owner_uidx").on(t.ownerId)]);

export const storeIntegrations = pgTable("store_integrations", {
  id: uuid("id").primaryKey().defaultRandom(), store: storeEnum("store").notNull(),
  status: integrationStatusEnum("status").notNull().default("not_configured"),
  credentialRef: text("credential_ref"), lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("store_integrations_store_uidx").on(t.store)]);

export const affiliateAccounts = pgTable("affiliate_accounts", {
  id: uuid("id").primaryKey().defaultRandom(), store: storeEnum("store").notNull(),
  affiliateIdentifier: text("affiliate_identifier").notNull(),
  status: integrationStatusEnum("status").notNull().default("pending"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("affiliate_accounts_store_identifier_uidx").on(t.store, t.affiliateIdentifier)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(), store: storeEnum("store").notNull(), externalId: text("external_id").notNull(),
  title: text("title").notNull(), category: text("category"), imageUrl: text("image_url"), productUrl: text("product_url").notNull(),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("products_store_external_id_uidx").on(t.store, t.externalId), index("products_store_idx").on(t.store)]);

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(), originalPrice: numeric("original_price", { precision: 14, scale: 2 }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }), couponCode: text("coupon_code"),
  source: text("source").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }), capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("offers_product_captured_idx").on(t.productId, t.capturedAt)]);

export const priceHistory = pgTable("price_history", {
  id: uuid("id").primaryKey().defaultRandom(), offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(), originalPrice: numeric("original_price", { precision: 14, scale: 2 }),
  couponCode: text("coupon_code"), source: text("source").notNull(), capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("price_history_offer_captured_idx").on(t.offerId, t.capturedAt)]);

export const affiliateLinks = pgTable("affiliate_links", {
  id: uuid("id").primaryKey().defaultRandom(), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  affiliateAccountId: uuid("affiliate_account_id").notNull().references(() => affiliateAccounts.id, { onDelete: "restrict" }),
  url: text("url").notNull(), validationStatus: integrationStatusEnum("validation_status").notNull().default("pending"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("affiliate_links_product_account_uidx").on(t.productId, t.affiliateAccountId)]);

export const destinations = pgTable("destinations", {
  id: uuid("id").primaryKey().defaultRandom(), platform: platformEnum("platform").notNull(), externalChatId: text("external_chat_id").notNull(),
  name: text("name").notNull(), status: integrationStatusEnum("status").notNull().default("pending"), permissions: jsonb("permissions").notNull().default({}),
  isPrivate: boolean("is_private").notNull().default(false), pausedAt: timestamp("paused_at", { withTimezone: true }),
  testDestination: boolean("test_destination").notNull().default(false), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex("destinations_platform_chat_uidx").on(t.platform, t.externalChatId)]);

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull(), enabled: boolean("enabled").notNull().default(false),
  filters: jsonb("filters").notNull().default({}), schedule: jsonb("schedule").notNull().default({}),
  approvalMode: approvalModeEnum("approval_mode").notNull().default("manual"), createdAt: createdAt(), updatedAt: updatedAt(),
  version: integer("version").notNull().default(1), deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const automationDestinations = pgTable("automation_destinations", {
  automationId: uuid("automation_id").notNull().references(() => automationRules.id, { onDelete: "cascade" }),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.automationId, t.destinationId] })]);

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull(), body: text("body").notNull(),
  store: storeEnum("store"), platform: platformEnum("platform"), affiliateDisclosure: text("affiliate_disclosure"),
  version: integer("version").notNull().default(1), createdAt: createdAt(), updatedAt: updatedAt(),
});

export const promotionDrafts = pgTable("promotion_drafts", {
  id: uuid("id").primaryKey().defaultRandom(), offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "restrict" }),
  affiliateLinkId: uuid("affiliate_link_id").notNull().references(() => affiliateLinks.id, { onDelete: "restrict" }),
  content: text("content").notNull(), approvalStatus: approvalStatusEnum("approval_status").notNull().default("pending"),
  factsSnapshot: jsonb("facts_snapshot").notNull().default({}), generatedBy: text("generated_by").notNull().default("template"),
  approvedAt: timestamp("approved_at", { withTimezone: true }), approvedBy: uuid("approved_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: createdAt(), updatedAt: updatedAt(),
});

export const publicationJobs = pgTable("publication_jobs", {
  id: uuid("id").primaryKey().defaultRandom(), draftId: uuid("draft_id").notNull().references(() => promotionDrafts.id, { onDelete: "restrict" }),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "restrict" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(), status: jobStatusEnum("status").notNull().default("waiting"),
  idempotencyKey: text("idempotency_key").notNull(), createdAt: createdAt(), updatedAt: updatedAt(),
  lockedAt: timestamp("locked_at", { withTimezone: true }), workerId: text("worker_id"),
}, (t) => [uniqueIndex("publication_jobs_idempotency_uidx").on(t.idempotencyKey), index("publication_jobs_status_schedule_idx").on(t.status, t.scheduledAt)]);

export const publicationAttempts = pgTable("publication_attempts", {
  id: uuid("id").primaryKey().defaultRandom(), jobId: uuid("job_id").notNull().references(() => publicationJobs.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull(), responseCode: text("response_code"), error: text("error"), createdAt: createdAt(),
}, (t) => [uniqueIndex("publication_attempts_job_number_uidx").on(t.jobId, t.attemptNumber)]);

export const publications = pgTable("publications", {
  id: uuid("id").primaryKey().defaultRandom(), jobId: uuid("job_id").notNull().references(() => publicationJobs.id, { onDelete: "restrict" }),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "restrict" }),
  affiliateLinkId: uuid("affiliate_link_id").notNull().references(() => affiliateLinks.id, { onDelete: "restrict" }),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "restrict" }),
  externalMessageId: text("external_message_id").notNull(), publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("publications_job_uidx").on(t.jobId)]);

export const clickEvents = pgTable("click_events", {
  id: uuid("id").primaryKey().defaultRandom(), publicationId: uuid("publication_id").notNull().references(() => publications.id, { onDelete: "cascade" }),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(), referrer: text("referrer"),
}, (t) => [index("click_events_publication_occurred_idx").on(t.publicationId, t.occurredAt)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(), type: text("type").notNull(), message: text("message").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }), createdAt: createdAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(), actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  action: text("action").notNull(), entityType: text("entity_type").notNull(), entityId: uuid("entity_id"),
  metadata: jsonb("metadata").notNull().default({}), createdAt: createdAt(),
}, (t) => [index("audit_logs_entity_idx").on(t.entityType, t.entityId), index("audit_logs_created_idx").on(t.createdAt)]);
