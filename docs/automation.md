# Motor de automações

O motor foi dividido em três partes para impedir que uma prévia tenha efeitos externos:

1. `AutomationEngine` avalia regras puras e produz decisões com motivos.
2. A fila BullMQ persiste jobs idempotentes no Redis.
3. `PublicationProcessor` revalida tudo no instante da publicação.

## Regras e horários

Filtros suportados: loja, categoria, palavras obrigatórias/proibidas, preço mínimo/máximo e desconto mínimo/máximo. A agenda recebe dias, janela operacional, intervalo, silêncio e timezone IANA; o padrão desta etapa é `America/Recife`.

Modos:

- `manual`: somente prepara o candidato;
- `semi_automatic`: prepara e aguarda aprovação;
- `automatic`: pode enfileirar após todas as regras, permissões e políticas serem aprovadas.

## Segurança de publicação

Antes de enviar, o processador verifica nesta ordem:

- pausa global;
- preço e disponibilidade atuais;
- validade do link afiliado;
- elegibilidade, autorização e pausa do destino;
- repetição do mesmo produto naquele destino durante a janela da regra.

O envio só ocorre depois dessas verificações. Resultado desconhecido chama reconciliação antes de permitir retry. A chave `ruleId:offerId:destinationId:scheduledAt` e a constraint do banco evitam jobs duplicados.

## BullMQ

- 5 tentativas com exponential backoff inicial de 2 segundos;
- jobs atrasados permanecem no Redis;
- lock de 30 segundos e no máximo uma recuperação de job travado;
- falhas esgotadas entram em `promoflow-publications-dead`;
- o worker inicia com concorrência 5 e limitador defensivo;
- limites específicos dos provedores continuam sendo respeitados pelos conectores e respostas 429.

O worker não inicia envios apenas por importar o módulo. O bootstrap de produção precisa compor explicitamente banco, conectores e `ProcessorDependencies`; `RUN_PROMOFLOW_WORKER=true` sem essa composição falha de forma segura.

## Operação

A pausa global grava `app_settings.automation_enabled=false` e é consultada antes de cada job. Excluir uma regra é soft-delete para preservar auditoria. Edições incrementam `version`.

Durante homologação, use somente destinos com `test_destination=true` e regras manuais ou semiautomáticas.
