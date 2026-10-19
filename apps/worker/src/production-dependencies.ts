import type { ProcessorDependencies, PublicationJobData } from "@promoflow/automation";
import { TelegramConnector, type Destination } from "@promoflow/messaging";

type Row = Record<string, unknown>;

class SupabaseRest {
  constructor(private readonly url: string, private readonly secretKey: string) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.secretKey,
        authorization: `Bearer ${this.secretKey}`,
        "content-type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`SUPABASE_${response.status}`);
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  list<T extends Row>(table: string, query: string) {
    return this.request<T[]>(`${table}?${query}`);
  }

  insert(table: string, value: Row, prefer = "return=minimal") {
    return this.request<void>(table, { method: "POST", headers: { Prefer: prefer }, body: JSON.stringify(value) });
  }

  update(table: string, query: string, value: Row) {
    return this.request<void>(`${table}?${query}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(value) });
  }
}

export function createProductionDependencies(config: {
  supabaseUrl: string;
  supabaseSecretKey: string;
  telegramToken: string;
  allowOnlyTestDestinations?: boolean;
}): ProcessorDependencies {
  const db = new SupabaseRest(config.supabaseUrl, config.supabaseSecretKey);
  const telegram = new TelegramConnector({ token: config.telegramToken });
  const onlyTests = config.allowOnlyTestDestinations ?? true;

  async function first<T extends Row>(table: string, query: string): Promise<T | undefined> {
    return (await db.list<T>(table, `${query}&limit=1`))[0];
  }

  async function getOffer(offerId: string) {
    return first<{ id: string; product_id: string; expires_at: string | null }>("offers", `select=id,product_id,expires_at&id=eq.${offerId}`);
  }

  async function getDestination(destinationId: string) {
    return first<{ id: string; name: string; platform: string; external_chat_id: string; status: string; permissions: Record<string, boolean>; paused_at: string | null; test_destination: boolean }>(
      "destinations",
      `select=id,name,platform,external_chat_id,status,permissions,paused_at,test_destination&id=eq.${destinationId}`,
    );
  }

  return {
    async isGloballyEnabled() {
      const settings = await first<{ automation_enabled: boolean }>("app_settings", "select=automation_enabled");
      return settings?.automation_enabled === true;
    },

    async validateOffer(offerId) {
      const offer = await getOffer(offerId);
      if (!offer) return { valid: false, reason: "OFFER_NOT_FOUND" };
      if (offer.expires_at && new Date(offer.expires_at) <= new Date()) return { valid: false, reason: "OFFER_EXPIRED" };
      return { valid: true };
    },

    async validateAffiliateLink(offerId) {
      const offer = await getOffer(offerId);
      if (!offer) return { valid: false, reason: "OFFER_NOT_FOUND" };
      const link = await first<{ id: string }>("affiliate_links", `select=id&product_id=eq.${offer.product_id}&validation_status=eq.available&verified_at=not.is.null`);
      return link ? { valid: true } : { valid: false, reason: "AFFILIATE_LINK_NOT_VERIFIED" };
    },

    async validateDestination(destinationId) {
      const destination = await getDestination(destinationId);
      if (!destination) return { valid: false, reason: "DESTINATION_NOT_FOUND" };
      if (destination.platform !== "telegram") return { valid: false, reason: "PLATFORM_NOT_SUPPORTED" };
      if (destination.status !== "available" || destination.paused_at) return { valid: false, reason: "DESTINATION_BLOCKED" };
      if (onlyTests && !destination.test_destination) return { valid: false, reason: "ONLY_TEST_DESTINATIONS_ALLOWED" };
      const permission = await telegram.checkDestination(destination.external_chat_id);
      return permission.authorized ? { valid: true } : { valid: false, reason: permission.reason };
    },

    async wasRecentlyPublished(offerId, destinationId) {
      const since = encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      const published = await first<{ id: string }>("publications", `select=id&offer_id=eq.${offerId}&destination_id=eq.${destinationId}&published_at=gte.${since}`);
      return Boolean(published);
    },

    async hasUnknownResult(data) {
      const job = await first<{ status: string }>("publication_jobs", `select=status&id=eq.${data.jobId}`);
      return job?.status === "unknown";
    },

    async send(data) {
      const job = await first<{ draft_id: string }>("publication_jobs", `select=draft_id&id=eq.${data.jobId}`);
      const draft = job && await first<{ content: string; affiliate_link_id: string; approval_status: string }>("promotion_drafts", `select=content,affiliate_link_id,approval_status&id=eq.${job.draft_id}`);
      const link = draft && await first<{ url: string }>("affiliate_links", `select=url&id=eq.${draft.affiliate_link_id}`);
      const destination = await getDestination(data.destinationId);
      if (!job || !draft || !link || !destination) return { status: "failed", code: "SEND_DATA_MISSING", error: "Publication data is incomplete" };
      if (draft.approval_status !== "approved") return { status: "failed", code: "DRAFT_NOT_APPROVED", error: "Draft requires approval" };
      const result = await telegram.send({
        id: destination.id,
        name: destination.name,
        platform: "telegram",
        externalId: destination.external_chat_id,
        status: destination.status === "available" ? "available" : "unavailable",
        paused: Boolean(destination.paused_at),
        permissions: destination.permissions ?? {},
        testDestination: destination.test_destination,
      } satisfies Destination, { text: draft.content, link: link.url });
      return { status: result.rawStatus, externalMessageId: result.externalMessageId, code: result.responseCode, error: result.error };
    },

    async reconcile(data) {
      const publication = await first<{ external_message_id: string }>("publications", `select=external_message_id&job_id=eq.${data.jobId}`);
      return publication ? { sent: true, externalMessageId: publication.external_message_id } : { sent: false };
    },

    async recordAttempt(data, result) {
      const latest = await first<{ attempt_number: number }>("publication_attempts", `select=attempt_number&job_id=eq.${data.jobId}&order=attempt_number.desc`);
      await db.insert("publication_attempts", { job_id: data.jobId, attempt_number: (latest?.attempt_number ?? 0) + 1, response_code: result.code, error: result.error ?? null });
      const status = result.status === "unknown" ? "unknown" : result.status === "sent" ? "processing" : "failed";
      await db.update("publication_jobs", `id=eq.${data.jobId}`, { status, updated_at: new Date().toISOString() });
    },

    async recordPublication(data, externalMessageId) {
      const job = await first<{ draft_id: string }>("publication_jobs", `select=draft_id&id=eq.${data.jobId}`);
      const draft = job && await first<{ affiliate_link_id: string }>("promotion_drafts", `select=affiliate_link_id&id=eq.${job.draft_id}`);
      if (!draft) throw new Error("DRAFT_NOT_FOUND");
      await db.request<void>("publications?on_conflict=job_id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ job_id: data.jobId, offer_id: data.offerId, affiliate_link_id: draft.affiliate_link_id, destination_id: data.destinationId, external_message_id: externalMessageId }),
      });
      await db.update("publication_jobs", `id=eq.${data.jobId}`, { status: "published", updated_at: new Date().toISOString() });
    },
  };
}
