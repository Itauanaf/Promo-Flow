"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createPublicationQueue, enqueuePublication } from "@promoflow/automation";
import { renderAd } from "@promoflow/content";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const store = z.enum(["shopee", "amazon", "mercado_livre", "aliexpress"]);
const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "Use uma URL HTTPS");
const text = z.string().trim().min(1).max(300);

async function context() {
  const user = await requireAdmin();
  return { user, supabase: await createSupabaseServerClient() };
}

async function audit(action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const { user, supabase } = await context();
  await supabase.from("audit_logs").insert({ actor_id: user.id, action, entity_type: entityType, entity_id: entityId, metadata });
}

export async function saveSettings(formData: FormData) {
  const input = z.object({ timezone: text, currency: z.string().trim().length(3) }).parse({ timezone: formData.get("timezone"), currency: formData.get("currency") });
  const { user, supabase } = await context();
  const { error } = await supabase.from("app_settings").update({ timezone: input.timezone, default_currency: input.currency.toUpperCase() }).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await audit("settings.updated", "app_settings", undefined, input);
  revalidatePath("/configuracoes");
}

export async function setGlobalAutomation(formData: FormData) {
  const enabled = formData.get("enabled") === "true";
  const { user, supabase } = await context();
  const { error } = await supabase.from("app_settings").update({ automation_enabled: enabled }).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  await audit(enabled ? "automation.global_enabled" : "automation.global_paused", "app_settings");
  revalidatePath("/dashboard"); revalidatePath("/automacoes"); revalidatePath("/configuracoes");
}

export async function createAffiliateAccount(formData: FormData) {
  const input = z.object({ store, identifier: text }).parse({ store: formData.get("store"), identifier: formData.get("identifier") });
  const { supabase } = await context();
  const { data, error } = await supabase.from("affiliate_accounts").insert({ store: input.store, affiliate_identifier: input.identifier, status: "available" }).select("id").single();
  if (error) throw new Error(error.message);
  await audit("affiliate.created", "affiliate_accounts", data.id, { store: input.store });
  revalidatePath("/afiliados"); revalidatePath("/ofertas");
}

export async function createManualOffer(formData: FormData) {
  const input = z.object({ store, externalId: text, title: text, category: z.string().trim().max(120).optional(), productUrl: httpsUrl, affiliateUrl: httpsUrl, accountId: z.string().uuid(), price: z.coerce.number().positive(), originalPrice: z.coerce.number().positive().optional(), coupon: z.string().trim().max(80).optional() }).parse({ store: formData.get("store"), externalId: formData.get("externalId"), title: formData.get("title"), category: formData.get("category") || undefined, productUrl: formData.get("productUrl"), affiliateUrl: formData.get("affiliateUrl"), accountId: formData.get("accountId"), price: formData.get("price"), originalPrice: formData.get("originalPrice") || undefined, coupon: formData.get("coupon") || undefined });
  const { supabase } = await context();
  const { data: product, error: productError } = await supabase.from("products").upsert({ store: input.store, external_id: input.externalId, title: input.title, category: input.category, product_url: input.productUrl }, { onConflict: "store,external_id" }).select("id").single();
  if (productError) throw new Error(productError.message);
  const discount = input.originalPrice && input.originalPrice > input.price ? ((input.originalPrice - input.price) / input.originalPrice * 100).toFixed(2) : null;
  const { data: offer, error: offerError } = await supabase.from("offers").insert({ product_id: product.id, price: input.price, original_price: input.originalPrice, discount_percent: discount, coupon_code: input.coupon, source: "manual_verified" }).select("id").single();
  if (offerError) throw new Error(offerError.message);
  const { error: linkError } = await supabase.from("affiliate_links").upsert({ product_id: product.id, affiliate_account_id: input.accountId, url: input.affiliateUrl, validation_status: "available", verified_at: new Date().toISOString() }, { onConflict: "product_id,affiliate_account_id" });
  if (linkError) throw new Error(linkError.message);
  await supabase.from("price_history").insert({ offer_id: offer.id, price: input.price, original_price: input.originalPrice, coupon_code: input.coupon, source: "manual_verified" });
  await audit("offer.created", "offers", offer.id, { store: input.store, source: "manual_verified" });
  revalidatePath("/ofertas"); revalidatePath("/dashboard");
}

export async function createAutomationRule(formData: FormData) {
  const input = z.object({ name: text, destinationId: z.string().uuid(), approvalMode: z.enum(["manual", "semi_automatic", "automatic"]), minDiscount: z.coerce.number().min(0).max(100), maxPrice: z.coerce.number().positive(), intervalMinutes: z.coerce.number().int().min(5).max(10080) }).parse({ name: formData.get("name"), destinationId: formData.get("destinationId"), approvalMode: formData.get("approvalMode"), minDiscount: formData.get("minDiscount"), maxPrice: formData.get("maxPrice"), intervalMinutes: formData.get("intervalMinutes") });
  const { supabase } = await context();
  const { data, error } = await supabase.from("automation_rules").insert({ name: input.name, enabled: false, approval_mode: input.approvalMode, filters: { minDiscount: input.minDiscount, maxPrice: input.maxPrice }, schedule: { timezone: "America/Recife", intervalMinutes: input.intervalMinutes } }).select("id").single();
  if (error) throw new Error(error.message);
  const { error: destinationError } = await supabase.from("automation_destinations").insert({ automation_id: data.id, destination_id: input.destinationId });
  if (destinationError) throw new Error(destinationError.message);
  await audit("automation.created", "automation_rules", data.id, { approvalMode: input.approvalMode });
  revalidatePath("/automacoes");
}

export async function toggleAutomationRule(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id")); const enabled = formData.get("enabled") === "true";
  const { supabase } = await context();
  const { error } = await supabase.from("automation_rules").update({ enabled, version: Number(formData.get("version") || 1) + 1 }).eq("id", id);
  if (error) throw new Error(error.message);
  await audit(enabled ? "automation.enabled" : "automation.paused", "automation_rules", id);
  revalidatePath("/automacoes");
}

export async function toggleDestination(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id")); const pause = formData.get("pause") === "true";
  const { supabase } = await context();
  const { error } = await supabase.from("destinations").update({ paused_at: pause ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw new Error(error.message);
  await audit(pause ? "destination.paused" : "destination.resumed", "destinations", id);
  revalidatePath("/grupos");
}

export async function createAndQueuePublication(formData: FormData) {
  const input = z.object({ offerId: z.string().uuid(), destinationId: z.string().uuid(), scheduledAt: z.string().optional() }).parse({ offerId: formData.get("offerId"), destinationId: formData.get("destinationId"), scheduledAt: String(formData.get("scheduledAt") || "") || undefined });
  const { user, supabase } = await context();
  const { data: offer, error } = await supabase.from("offers").select("id,price,original_price,discount_percent,coupon_code,products!inner(id,title,store,affiliate_links!inner(id,url,validation_status))").eq("id", input.offerId).eq("products.affiliate_links.validation_status", "available").limit(1).single();
  if (error || !offer) throw new Error(error?.message ?? "Oferta não encontrada");
  const product = Array.isArray(offer.products) ? offer.products[0] : offer.products;
  if (!product) throw new Error("Produto da oferta não encontrado");
  const links = Array.isArray(product.affiliate_links) ? product.affiliate_links : [product.affiliate_links];
  const link = links[0];
  if (!product || !link) throw new Error("A oferta precisa de link de afiliado validado");
  const content = renderAd({ productName: product.title, store: product.store, platform: "telegram", currentPrice: Number(offer.price).toFixed(2), previousPrice: offer.original_price ? Number(offer.original_price).toFixed(2) : undefined, currency: "BRL", discountPercent: offer.discount_percent ? String(offer.discount_percent) : undefined, coupon: offer.coupon_code ?? undefined, affiliateUrl: link.url, affiliateDisclosure: "Publicidade • Link de afiliado. Preço e disponibilidade podem mudar." });
  const { data: draft, error: draftError } = await supabase.from("promotion_drafts").insert({ offer_id: offer.id, affiliate_link_id: link.id, content, approval_status: "approved", generated_by: "template", approved_at: new Date().toISOString(), approved_by: user.id, facts_snapshot: { price: offer.price, originalPrice: offer.original_price, discount: offer.discount_percent, coupon: offer.coupon_code } }).select("id").single();
  if (draftError) throw new Error(draftError.message);
  const jobId = randomUUID(); const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : new Date().toISOString(); const idempotencyKey = `panel:${jobId}`;
  const { error: jobError } = await supabase.from("publication_jobs").insert({ id: jobId, draft_id: draft.id, destination_id: input.destinationId, scheduled_at: scheduledAt, status: "waiting", idempotency_key: idempotencyKey });
  if (jobError) throw new Error(jobError.message);
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL não configurada no Vercel");
  const queue = createPublicationQueue(process.env.REDIS_URL);
  try { await enqueuePublication(queue, { jobId, ruleId: "40000000-0000-4000-8000-000000000001", offerId: offer.id, destinationId: input.destinationId, idempotencyKey, scheduledAt }); } finally { await queue.close(); }
  await audit("publication.queued", "publication_jobs", jobId, { destinationId: input.destinationId });
  revalidatePath("/publicacoes"); revalidatePath("/dashboard");
}
