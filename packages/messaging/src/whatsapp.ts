import type { ConnectionResult, Destination, DestinationStatus, MessagingConnector, OutboundMessage, PermissionResult, SendResult } from "./types";

export interface WhatsAppConfig { status?:DestinationStatus; eligibilityConfirmed?:boolean; groupsPermissionConfirmed?:boolean; }
export class WhatsAppConnector implements MessagingConnector {
  readonly platform="whatsapp" as const;
  constructor(private readonly config:WhatsAppConfig={}){}
  getStatus():DestinationStatus{if(this.config.status==="unavailable")return"unavailable";if(!this.config.eligibilityConfirmed)return this.config.status??"not_configured";if(!this.config.groupsPermissionConfirmed)return"pending_eligibility";return"available";}
  testConnection():Promise<ConnectionResult>{const status=this.getStatus();return Promise.resolve(status==="available"?{ok:true,identity:"WhatsApp Business Platform"}:{ok:false,error:status==="pending_eligibility"?"Elegibilidade ou permissão para grupos ainda não confirmada.":"WhatsApp não configurado ou indisponível."});}
  checkDestination(_externalId:string):Promise<PermissionResult>{const available=this.getStatus()==="available";return Promise.resolve({authorized:available,permissions:{send_messages:available,send_photos:available},reason:available?"Conta e recurso de grupos marcados como elegíveis.":"A API não foi confirmada para este grupo; use o fluxo manual."});}
  send(_destination:Destination,_message:OutboundMessage):Promise<SendResult>{return Promise.resolve({ok:false,platform:this.platform,responseCode:"WHATSAPP_GROUPS_NOT_IMPLEMENTED",error:"Envio automático não habilitado sem integração e elegibilidade verificadas.",rawStatus:"failed"});}
  prepareManual(message:OutboundMessage){return [message.text,message.link].filter(Boolean).join("\n");}
}
