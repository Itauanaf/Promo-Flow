import { randomUUID } from "node:crypto";
import { createPublicationQueue, enqueuePublication } from "@promoflow/automation";
import { renderAd } from "@promoflow/content";

type Rule = { id:string; filters:{minDiscount?:number;maxPrice?:number}; schedule:{intervalMinutes?:number}; approval_mode:string };
type Offer = { id:string; price:string; original_price:string|null; discount_percent:string|null; coupon_code:string|null; expires_at:string|null; products:{title:string;store:"shopee"|"amazon"|"mercado_livre"|"aliexpress";affiliate_links:Array<{id:string;url:string;validation_status:string;verified_at:string|null}>} };

class Rest {
  constructor(private url:string,private key:string){}
  async request<T>(path:string,init:RequestInit={}):Promise<T>{const response=await fetch(`${this.url}/rest/v1/${path}`,{...init,headers:{apikey:this.key,authorization:`Bearer ${this.key}`,"content-type":"application/json",...init.headers},signal:AbortSignal.timeout(10_000)});if(!response.ok)throw new Error(`SCHEDULER_SUPABASE_${response.status}`);const body=await response.text();return(body?JSON.parse(body):undefined)as T;}
  list<T>(path:string){return this.request<T[]>(path)}
}

export function startAutomationScheduler(config:{redisUrl:string;supabaseUrl:string;supabaseSecretKey:string;intervalMs?:number}){
  const db=new Rest(config.supabaseUrl,config.supabaseSecretKey);const queue=createPublicationQueue(config.redisUrl);let running=false;
  async function tick(){if(running)return;running=true;try{
    const settings=await db.list<{automation_enabled:boolean}>("app_settings?select=automation_enabled&limit=1");if(!settings[0]?.automation_enabled)return;
    const rules=await db.list<Rule>("automation_rules?select=id,filters,schedule,approval_mode&enabled=eq.true&deleted_at=is.null&approval_mode=eq.automatic");
    for(const rule of rules){const interval=Math.max(5,Number(rule.schedule?.intervalMinutes??60));const bucket=Math.floor(Date.now()/(interval*60_000));
      const offers=await db.list<Offer>("offers?select=id,price,original_price,discount_percent,coupon_code,expires_at,products!inner(title,store,affiliate_links!inner(id,url,validation_status,verified_at))&products.affiliate_links.validation_status=eq.available&products.affiliate_links.verified_at=not.is.null&order=captured_at.desc&limit=25");
      const eligible=offers.filter(o=>(!o.expires_at||new Date(o.expires_at)>new Date())&&Number(o.discount_percent??0)>=Number(rule.filters?.minDiscount??0)&&Number(o.price)<=Number(rule.filters?.maxPrice??Number.MAX_SAFE_INTEGER));
      const destinations=await db.list<{destination_id:string}>(`automation_destinations?select=destination_id&automation_id=eq.${rule.id}`);
      for(const offer of eligible.slice(0,3)){for(const destination of destinations){const idempotencyKey=`auto:${rule.id}:${offer.id}:${destination.destination_id}:${bucket}`;const existing=await db.list<{id:string}>(`publication_jobs?select=id&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`);if(existing[0])continue;
        const link=offer.products.affiliate_links[0];if(!link)continue;const content=renderAd({productName:offer.products.title,store:offer.products.store,platform:"telegram",currentPrice:Number(offer.price).toFixed(2),previousPrice:offer.original_price?Number(offer.original_price).toFixed(2):undefined,currency:"BRL",discountPercent:offer.discount_percent??undefined,coupon:offer.coupon_code??undefined,affiliateUrl:link.url,affiliateDisclosure:"Publicidade • Link de afiliado. Preço e disponibilidade podem mudar."});
        const draftId=randomUUID();const jobId=randomUUID();const now=new Date().toISOString();
        await db.request("promotion_drafts",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:draftId,offer_id:offer.id,affiliate_link_id:link.id,content,approval_status:"approved",facts_snapshot:{price:offer.price,discount:offer.discount_percent,coupon:offer.coupon_code},generated_by:"automatic_template",approved_at:now})});
        await db.request("publication_jobs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:jobId,draft_id:draftId,destination_id:destination.destination_id,scheduled_at:now,status:"waiting",idempotency_key:idempotencyKey})});
        await enqueuePublication(queue,{jobId,ruleId:rule.id,offerId:offer.id,destinationId:destination.destination_id,idempotencyKey,scheduledAt:now});
      }}
    }
  }catch(error){console.error("Automation scheduler tick failed",error instanceof Error?error.message:"UNKNOWN");}finally{running=false;}}
  const timer=setInterval(()=>void tick(),config.intervalMs??60_000);void tick();
  return{close:async()=>{clearInterval(timer);await queue.close();}};
}
