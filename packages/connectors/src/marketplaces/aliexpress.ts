import { BaseMarketplaceConnector } from "./base";
import type { CapabilityMap } from "./types";

export interface AliExpressConfig { credentialRef?: string; accessApproved?: boolean; }
export class AliExpressConnector extends BaseMarketplaceConnector {
  readonly id="aliexpress" as const;
  constructor(private readonly config:AliExpressConfig={}){super();}
  getCapabilityStatus():CapabilityMap { const reason=this.config.accessApproved&&this.config.credentialRef?"Acesso registrado, mas as operações permanecem bloqueadas até validar os recursos concedidos à conta.":"Disponibilidade da API de afiliados depende da elegibilidade e permissões da conta."; const state=this.config.accessApproved&&this.config.credentialRef?"permission_required":"credentials_required"; return {testConnection:{state,reason},searchProducts:{state,reason},getProduct:{state,reason},getOffers:{state,reason},generateAffiliateLink:{state,reason},validateAffiliateLink:{state:"supported",reason:"Validação estrutural local; não confirma atribuição da comissão."}}; }
  async validateAffiliateLink(url:string){try{const host=new URL(url).hostname;return host==="aliexpress.com"||host.endsWith(".aliexpress.com");}catch{return false;}}
}
