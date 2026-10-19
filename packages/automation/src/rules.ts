import { z } from "zod";

export const automationModeSchema=z.enum(["manual","semi_automatic","automatic"]);
export const automationRuleSchema=z.object({
  id:z.string().uuid(),name:z.string().min(1).max(120),enabled:z.boolean().default(false),mode:automationModeSchema.default("manual"),
  stores:z.array(z.enum(["shopee","amazon","mercado_livre","aliexpress"])).min(1),categories:z.array(z.string()).default([]),
  includeKeywords:z.array(z.string()).default([]),excludeKeywords:z.array(z.string()).default([]),
  minPrice:z.number().nonnegative().optional(),maxPrice:z.number().positive().optional(),minDiscount:z.number().min(0).max(100).optional(),maxDiscount:z.number().min(0).max(100).optional(),
  destinationIds:z.array(z.string().uuid()).min(1),repeatWindowHours:z.number().int().min(1).max(720).default(168),
  schedule:z.object({timezone:z.string().default("America/Recife"),weekdays:z.array(z.number().int().min(0).max(6)).min(1),start:z.string().regex(/^\d{2}:\d{2}$/),end:z.string().regex(/^\d{2}:\d{2}$/),intervalMinutes:z.number().int().min(1),quietStart:z.string().regex(/^\d{2}:\d{2}$/).optional(),quietEnd:z.string().regex(/^\d{2}:\d{2}$/).optional()}),
}).refine(v=>v.minPrice===undefined||v.maxPrice===undefined||v.minPrice<=v.maxPrice,{message:"minPrice must not exceed maxPrice"}).refine(v=>v.minDiscount===undefined||v.maxDiscount===undefined||v.minDiscount<=v.maxDiscount,{message:"minDiscount must not exceed maxDiscount"});
export type AutomationRule=z.infer<typeof automationRuleSchema>;
export interface OfferCandidate{id:string;productId:string;store:"shopee"|"amazon"|"mercado_livre"|"aliexpress";title:string;category?:string;price:number;discountPercent?:number;available:boolean;affiliateLinkValid:boolean;source:string;}
export interface RuleDecision{selected:boolean;reasons:string[];}
