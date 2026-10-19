# Conectores de marketplaces

Status revisado em 19 de outubro de 2026. O código diferencia catálogo, oferta e atribuição de afiliado; ter acesso ao catálogo nunca implica permissão para gerar links monetizados.

| Loja | Catálogo | Link afiliado | Ativação |
| --- | --- | --- | --- |
| Amazon | Creators API | URL atribuída retornada pela Creators API | Credenciais LwA, Partner Tag BR e conta elegível |
| Mercado Livre | API oficial de itens e preços | Manual pelas ferramentas oficiais | OAuth para preços contextuais; confirmar política do canal |
| Shopee | Bloqueado até consultar o schema autorizado | API de afiliados quando autorizada | App ID, segredo protegido e acesso aprovado |
| AliExpress | Bloqueado | Bloqueado até comprovar acesso | Credenciais e recursos concedidos à conta |

## Amazon Brasil

A implementação usa OAuth 2.0 client credentials no endpoint LwA da região NA, `https://creatorsapi.amazon`, marketplace `www.amazon.com.br`, operações `SearchItems` e `GetItems`, e o recurso atual `OffersV2`. A URL afiliada é aceita somente quando veio do produto retornado e contém o `Partner Tag` configurado. Não há fallback para PA-API 5.0.

## Mercado Livre

Busca e item usam apenas a API pública documentada. Preço contextual usa `/items/{id}/sale_price` com token. O conector nunca transforma uma URL de catálogo em link afiliado: links criados pela Barra/Gerador de Links entram pelo fluxo manual e mantêm validação separada. Antes de associar um destino, confirme se o programa permite aquele canal e se o grupo é público.

## Shopee e AliExpress

Não foram codificados endpoints por inferência. Ambos permanecem em `credentials_required` ou `permission_required`; chamadas de rede lançam `CapabilityError`. Somente a validação estrutural do domínio está disponível, e ela não prova atribuição de comissão.

## Resiliência e dados

- Retentativas apenas para 429 e falhas transitórias 5xx, com exponential backoff, jitter e `Retry-After`.
- Respostas externas são validadas com Zod antes da normalização.
- Dinheiro é convertido para string decimal; nenhuma operação usa ponto flutuante para persistência.
- A origem acompanha produto e oferta normalizados.
- O sistema não faz scraping, automação de navegador ou uso de endpoints privados.
- Respostas brutas não são persistidas por padrão; armazene apenas os campos permitidos pelo provedor.

## Fontes oficiais

- Amazon Creators API: https://affiliate-program.amazon.com/creatorsapi/docs/
- Shopee Affiliate API Explorer BR: https://open-api.affiliate.shopee.com.br/explorer
- Mercado Livre Developers: https://developers.mercadolivre.com.br/
- AliExpress Open Platform: validar dentro do portal habilitado para a conta antes de ativar qualquer operação.
