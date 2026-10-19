export type MarketplaceId = "shopee" | "amazon" | "mercado_livre" | "aliexpress";
export type CapabilityName = "testConnection" | "searchProducts" | "getProduct" | "getOffers" | "generateAffiliateLink" | "validateAffiliateLink";
export type CapabilityState = "supported" | "credentials_required" | "permission_required" | "manual_only" | "unavailable";

export interface Capability { state: CapabilityState; reason: string; documentationUrl?: string; }
export type CapabilityMap = Record<CapabilityName, Capability>;
export interface Money { amount: string; currency: string; }
export interface NormalizedProduct { store: MarketplaceId; externalId: string; title: string; category?: string; imageUrl?: string; productUrl: string; source: string; }
export interface NormalizedOffer { productExternalId: string; price: Money; originalPrice?: Money; discountPercent?: string; couponCode?: string; available: boolean; capturedAt: string; source: string; }
export interface SearchInput { query: string; page?: number; pageSize?: number; category?: string; }
export interface AffiliateLinkInput { product: NormalizedProduct; manualUrl?: string; }
export interface AffiliateLinkResult { url: string; generatedBy: "provider" | "manual"; valid: boolean; }
export interface ConnectionResult { ok: boolean; message: string; }

export interface MarketplaceConnector {
  readonly id: MarketplaceId;
  getCapabilityStatus(): CapabilityMap;
  testConnection(): Promise<ConnectionResult>;
  searchProducts(input: SearchInput): Promise<NormalizedProduct[]>;
  getProduct(externalId: string): Promise<NormalizedProduct | null>;
  getOffers(externalId: string): Promise<NormalizedOffer[]>;
  generateAffiliateLink(input: AffiliateLinkInput): Promise<AffiliateLinkResult>;
  validateAffiliateLink(url: string): Promise<boolean>;
}

export class CapabilityError extends Error {
  constructor(public readonly capability: CapabilityName, public readonly state: CapabilityState, message: string) { super(message); this.name = "CapabilityError"; }
}
