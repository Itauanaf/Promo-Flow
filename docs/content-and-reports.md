# Criador de anúncios e relatórios

## Fatos protegidos

`SafeAdCreator` recebe um snapshot validado contendo produto, preços, desconto, cupom, link afiliado, origem da imagem e identificação publicitária. Templates substituem somente esses valores. Campos ausentes aparecem como não informados; nunca são inferidos.

Um provedor de IA é opcional e implementa `AiTextProvider`. Depois da geração, o serviço exige que preço atual, preço anterior, cupom, link e identificação permaneçam literalmente presentes. Uma saída que altere ou omita qualquer fato é rejeitada e não pode ser salva ou aprovada.

As imagens só são marcadas como utilizáveis quando possuem URL e origem em um conector oficial conhecido. A aplicação não copia nem re-hospeda a imagem automaticamente.

O fluxo persistido possui `facts_snapshot`, `generated_by`, `approval_status`, `approved_at` e `approved_by`. Envio de teste permanece bloqueado até uma ação explícita do administrador, com destino autorizado e marcado para homologação.

## Relatórios

As linhas suportam ofertas encontradas, aprovadas, descartadas e seus motivos, publicações por estado, loja, destino e período. Cliques só recebem qualidade `verified` quando vierem de mecanismo autorizado. Métricas também podem ser:

- `verified`: fonte operacional ou oficial disponível;
- `estimated`: cálculo aproximado claramente identificado;
- `unavailable`: não há fonte autorizada.

Vendas, comissões e conversão usam valor `null` e qualidade `unavailable` até que um relatório oficial do programa seja conectado. A exportação CSV inclui a qualidade de dados para não perder essa distinção fora do painel.

A interface atual demonstra filtros e exportação com registros explicitamente identificados como demonstrativos; ela não os apresenta como produção.
