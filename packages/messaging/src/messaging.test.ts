import { describe,expect,it,vi } from "vitest";
import { TelegramConnector } from "./telegram";
import { WhatsAppConnector } from "./whatsapp";
import type { Destination } from "./types";

const destination:Destination={id:"1",name:"Teste",platform:"telegram",externalId:"-100123",status:"available",paused:false,permissions:{send_messages:true},testDestination:true};
describe("TelegramConnector",()=>{
  it("records the returned message id",async()=>{const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:true,result:{message_id:321}}),{status:200,headers:{"content-type":"application/json"}}));const result=await new TelegramConnector({token:"test-token",fetchImpl:fetchImpl as typeof fetch}).send(destination,{text:"Teste controlado"});expect(result).toMatchObject({ok:true,externalMessageId:"321",rawStatus:"sent"});});
  it("never sends to a paused destination",async()=>{const fetchImpl=vi.fn();const result=await new TelegramConnector({token:"test",fetchImpl:fetchImpl as typeof fetch}).send({...destination,paused:true},{text:"Não enviar"});expect(result.responseCode).toBe("DESTINATION_BLOCKED");expect(fetchImpl).not.toHaveBeenCalled();});
});
describe("WhatsAppConnector",()=>{
  it("does not simulate success without eligibility",async()=>{const connector=new WhatsAppConnector({status:"pending_eligibility"});expect((await connector.send({...destination,platform:"whatsapp"},{text:"Oferta"})).ok).toBe(false);expect(connector.prepareManual({text:"Oferta",link:"https://example.com"})).toBe("Oferta\nhttps://example.com");});
});
