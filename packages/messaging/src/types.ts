export type MessagingPlatform = "telegram" | "whatsapp";
export type DestinationStatus = "not_configured" | "pending_eligibility" | "available" | "unavailable" | "paused";
export interface Destination { id:string; name:string; platform:MessagingPlatform; externalId:string; status:DestinationStatus; paused:boolean; permissions:Record<string,boolean>; testDestination:boolean; }
export interface OutboundMessage { text:string; link?:string; photoUrl?:string; caption?:string; parseMode?:"HTML"; }
export interface SendResult { ok:boolean; platform:MessagingPlatform; externalMessageId?:string; sentAt?:string; responseCode:string; error?:string; retryAfterSeconds?:number; rawStatus:"sent"|"failed"|"unknown"; }
export interface ConnectionResult { ok:boolean; identity?:string; error?:string; }
export interface PermissionResult { authorized:boolean; permissions:Record<string,boolean>; reason:string; }
export interface MessagingConnector { readonly platform:MessagingPlatform; testConnection():Promise<ConnectionResult>; checkDestination(externalId:string):Promise<PermissionResult>; send(destination:Destination,message:OutboundMessage):Promise<SendResult>; }
