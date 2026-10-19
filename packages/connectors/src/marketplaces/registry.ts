import { AliExpressConnector, type AliExpressConfig } from "./aliexpress";
import { AmazonConnector, type AmazonConfig } from "./amazon";
import { MercadoLivreConnector, type MercadoLivreConfig } from "./mercado-livre";
import { ShopeeConnector, type ShopeeConfig } from "./shopee";

export interface MarketplaceRegistryConfig { amazon:AmazonConfig; mercadoLivre?:MercadoLivreConfig; shopee?:ShopeeConfig; aliexpress?:AliExpressConfig; }
export function createMarketplaceRegistry(config:MarketplaceRegistryConfig){return {amazon:new AmazonConnector(config.amazon),mercado_livre:new MercadoLivreConnector(config.mercadoLivre),shopee:new ShopeeConnector(config.shopee),aliexpress:new AliExpressConnector(config.aliexpress)} as const;}
