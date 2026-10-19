import { describe, expect, it, vi } from "vitest";
import { ResilientHttpClient } from "../http";
import { AmazonConnector } from "./amazon";
import { MercadoLivreConnector } from "./mercado-livre";
import { ShopeeConnector } from "./shopee";

describe("marketplace capability contracts",()=>{
  it("keeps Shopee calls disabled without authorized credentials",()=>{expect(new ShopeeConnector().getCapabilityStatus().searchProducts.state).toBe("credentials_required");});
  it("separates Mercado Livre catalog from affiliate links",()=>{const capabilities=new MercadoLivreConnector().getCapabilityStatus();expect(capabilities.getProduct.state).toBe("supported");expect(capabilities.generateAffiliateLink.state).toBe("manual_only");});
  it("validates Amazon Brazil links against the configured Partner Tag",async()=>{const connector=new AmazonConnector({partnerTag:"promo-20"});expect(await connector.validateAffiliateLink("https://www.amazon.com.br/dp/ABC?tag=promo-20")).toBe(true);expect(await connector.validateAffiliateLink("https://evil.example/?tag=promo-20")).toBe(false);});
});

describe("resilient HTTP",()=>{
  it("retries rate limits and succeeds",async()=>{const fetchImpl=vi.fn().mockResolvedValueOnce(new Response(null,{status:429,headers:{"retry-after":"0"}})).mockResolvedValueOnce(new Response("{}",{status:200}));const http=new ResilientHttpClient({fetchImpl:fetchImpl as typeof fetch,baseDelayMs:1});const response=await http.request("https://example.test");expect(response.status).toBe(200);expect(fetchImpl).toHaveBeenCalledTimes(2);});
});
