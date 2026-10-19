import { randomUUID } from "node:crypto";
import { createPublicationQueue } from "@promoflow/automation";

const required = ["REDIS_URL", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "TELEGRAM_TEST_CHAT_ID"] as const;
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);

const redisUrl = process.env.REDIS_URL!;
const supabaseUrl = process.env.SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const chatId = process.env.TELEGRAM_TEST_CHAT_ID!;

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: secret, authorization: `Bearer ${secret}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`SUPABASE_${response.status}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function upsert(table: string, value: Record<string, unknown>) {
  await rest(`${table}?on_conflict=id`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(value) });
}

async function patch(table: string, query: string, value: Record<string, unknown>) {
  await rest(`${table}?${query}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(value) });
}

async function main() {
  const queue = createPublicationQueue(redisUrl);
  const offerId = randomUUID();
  const draftId = randomUUID();
  const jobId = randomUUID();
  const productId = "10000000-0000-4000-8000-000000000001";
  const accountId = "20000000-0000-4000-8000-000000000001";
  const linkId = "30000000-0000-4000-8000-000000000001";
  const ruleId = "40000000-0000-4000-8000-000000000001";
  let controlsOpened = false;

  try {
    const profiles = await rest<Array<{ id: string }>>("profiles?select=id&role=eq.admin&limit=1");
    const destinations = await rest<Array<{ id: string }>>(`destinations?select=id&external_chat_id=eq.${encodeURIComponent(chatId)}&test_destination=eq.true&limit=1`);
    if (!profiles[0] || !destinations[0]) throw new Error("ADMIN_OR_TEST_DESTINATION_NOT_FOUND");
    const adminId = profiles[0].id;
    const destinationId = destinations[0].id;

    await upsert("affiliate_accounts", { id: accountId, store: "amazon", affiliate_identifier: "promoflow-homologation", status: "available" });
    await upsert("products", { id: productId, store: "amazon", external_id: "PROMOFLOW-TEST-001", title: "Produto fictício de homologação", category: "teste", product_url: "https://example.com/promoflow-test" });
    await upsert("affiliate_links", { id: linkId, product_id: productId, affiliate_account_id: accountId, url: "https://example.com/promoflow-test", validation_status: "available", verified_at: new Date().toISOString() });
    await upsert("automation_rules", { id: ruleId, name: "Homologação controlada do Telegram", enabled: true, filters: {}, schedule: {}, approval_mode: "manual" });
    await upsert("offers", { id: offerId, product_id: productId, price: 19.9, original_price: 29.9, discount_percent: 33.44, source: "controlled_homologation", captured_at: new Date().toISOString() });
    await upsert("promotion_drafts", { id: draftId, offer_id: offerId, affiliate_link_id: linkId, content: "[TESTE CONTROLADO] Pipeline real do PromoFlow validado. Esta não é uma promoção comercial.", approval_status: "approved", facts_snapshot: { test: true }, generated_by: "controlled_homologation", approved_at: new Date().toISOString(), approved_by: adminId });
    await upsert("publication_jobs", { id: jobId, draft_id: draftId, destination_id: destinationId, scheduled_at: new Date().toISOString(), status: "waiting", idempotency_key: `homologation:${jobId}` });
    await rest("automation_destinations?on_conflict=automation_id,destination_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ automation_id: ruleId, destination_id: destinationId }) });

    await patch("destinations", `id=eq.${destinationId}`, { paused_at: null });
    await patch("app_settings", `owner_id=eq.${adminId}`, { automation_enabled: true });
    controlsOpened = true;

    await queue.add("publish", { jobId, ruleId, offerId, destinationId, idempotencyKey: `homologation:${jobId}`, scheduledAt: new Date().toISOString() }, { jobId: `homologation_${jobId}`, attempts: 3, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: false, removeOnFail: false });

    for (let attempt = 0; attempt < 45; attempt++) {
      const publications = await rest<Array<{ external_message_id: string }>>(`publications?select=external_message_id&job_id=eq.${jobId}&limit=1`);
      if (publications[0]) {
        console.log(JSON.stringify({ ok: true, jobId, externalMessageId: publications[0].external_message_id }));
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    throw new Error("HOMOLOGATION_TIMEOUT");
  } finally {
    if (controlsOpened) {
      await patch("app_settings", "automation_enabled=eq.true", { automation_enabled: false });
      await patch("destinations", `external_chat_id=eq.${encodeURIComponent(chatId)}`, { paused_at: new Date().toISOString() });
    }
    await queue.close();
  }
}

void main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
