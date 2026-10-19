import { BaseMarketplaceConnector } from "./base";
import type { CapabilityMap } from "./types";

export interface ShopeeConfig { appId?: string; secretRef?: string; accessApproved?: boolean; }
export class ShopeeConnector extends BaseMarketplaceConnector {
  readonly id="shopee" as const;
  constructor(private readonly config:ShopeeConfig={}){super();}
  getCapabilityStatus():CapabilityMap { const enabled=Boolean(this.config.appId&&this.config.secretRef&&this.config.accessApproved); const state=enabled?"permission_required":"credentials_required"; const reason=enabled?"Credenciais registradas; confirme o schema autorizado no Explorer antes de ativar chamadas.":"Exige App ID, segredo protegido e aprovação na API de afiliados."; return {testConnection:{state,reason,documentationUrl:"https://open-api.affiliate.shopee.com.br/explorer"},searchProducts:{state,reason},getProduct:{state,reason},getOffers:{state,reason},generateAffiliateLink:{state,reason},validateAffiliateLink:{state:"supported",reason:"Validação estrutural local; não confirma atribuição da comissão."}}; }
  async validateAffiliateLink(url:string){try{const host=new URL(url).hostname;return host==="shopee.com.br"||host.endsWith(".shopee.com.br");}catch{return false;}}
}
