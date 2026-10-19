import { CapabilityError, type AffiliateLinkInput, type AffiliateLinkResult, type CapabilityMap, type CapabilityName, type ConnectionResult, type MarketplaceConnector, type MarketplaceId, type NormalizedOffer, type NormalizedProduct, type SearchInput } from "./types";

export abstract class BaseMarketplaceConnector implements MarketplaceConnector {
  abstract readonly id: MarketplaceId;
  abstract getCapabilityStatus(): CapabilityMap;
  protected unavailable(capability: CapabilityName): never { const item = this.getCapabilityStatus()[capability]; throw new CapabilityError(capability, item.state, item.reason); }
  testConnection(): Promise<ConnectionResult> { return Promise.resolve(this.unavailable("testConnection")); }
  searchProducts(_input: SearchInput): Promise<NormalizedProduct[]> { return Promise.resolve(this.unavailable("searchProducts")); }
  getProduct(_externalId: string): Promise<NormalizedProduct | null> { return Promise.resolve(this.unavailable("getProduct")); }
  getOffers(_externalId: string): Promise<NormalizedOffer[]> { return Promise.resolve(this.unavailable("getOffers")); }
  generateAffiliateLink(input: AffiliateLinkInput): Promise<AffiliateLinkResult> {
    if (!input.manualUrl) return Promise.resolve(this.unavailable("generateAffiliateLink"));
    return this.validateAffiliateLink(input.manualUrl).then((valid) => ({ url: input.manualUrl!, generatedBy: "manual", valid }));
  }
  validateAffiliateLink(_url: string): Promise<boolean> { return Promise.resolve(this.unavailable("validateAffiliateLink")); }
}
