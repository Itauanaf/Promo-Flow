# Auditoria de produção — 19/10/2026

## Resultado

O código está apto para homologação, mas **não está autorizado para produção**. Não há credenciais reais, teste de restauração, validação RLS em uma instância Supabase nem bootstrap do worker com dependências reais. A pausa global deve permanecer ativa.

## Achados corrigidos

| Severidade | Achado | Correção |
| --- | --- | --- |
| Crítica | Painel liberava acesso quando Supabase não estava configurado | Middleware e layout agora falham fechados; demonstração exige flag explícita e nunca funciona em produção |
| Alta | Retries podiam reenviar após resultado desconhecido | Tentativas anteriores desconhecidas são reconciliadas antes de qualquer novo envio |
| Alta | Drizzle ORM vulnerável a injeção de identificadores | Atualizado para versão corrigida `>=0.45.2` |
| Alta | PostCSS transitivo com leitura arbitrária de arquivos | Override para versão corrigida `>=8.5.18` |
| Alta | URLs de imagem aceitavam qualquer host HTTPS | Allowlist vinculada à origem oficial do marketplace |
| Alta | Erros de rede e logs poderiam carregar detalhes sensíveis | Erros do Telegram e worker são sanitizados; nenhum token entra no log |
| Média | Dados demonstrativos podiam aparecer sem opt-in | `ENABLE_DEMO_MODE=true` é exigido em desenvolvimento; produção sempre ignora a flag |
| Média | IDs BullMQ continham caractere reservado | Job ID é normalizado sem `:` mantendo idempotência |
| Média | Headers defensivos ausentes | HSTS, frame denial, nosniff, referrer e permissions policy adicionados |

## Controles revisados

- Autenticação: Supabase Auth, e-mail administrativo fixo, middleware e proteção server-side.
- IDOR/Server Actions: não existem endpoints mutáveis ou Server Actions públicos nesta versão.
- RLS: todas as tabelas públicas possuem RLS; auditoria aceita somente leitura/inserção administrativa e é append-only.
- Segredos: variáveis server-only ou referências opacas no schema privado; nenhuma credencial real versionada.
- XSS: conteúdo de templates escapa fatos interpolados; não há `dangerouslySetInnerHTML`.
- SSRF: conectores usam endpoints constantes; URLs comerciais exigem HTTPS e imagens oficiais usam allowlist.
- Uploads: não existe endpoint de upload nesta versão; requisito não aplicável até implementação futura.
- Fila: idempotência no banco e Redis, backoff, lock, stalled limit, dead-letter e reconciliação.
- APIs: WhatsApp continua bloqueado; Shopee/AliExpress dependem de autorização; Mercado Livre separa catálogo de afiliados.
- Mocks: somente testes; dados demonstrativos exigem flag local explícita.

## Riscos residuais

| Severidade | Risco | Ação necessária |
| --- | --- | --- |
| Bloqueador | Worker ainda não possui composição de produção | Implementar adaptadores reais de banco/conectores após obter credenciais |
| Bloqueador | RLS não foi exercitada contra Supabase real | Executar matriz anon/não-admin/admin em homologação |
| Bloqueador | Backup não foi restaurado | Restaurar dump/PITR em projeto isolado e registrar evidências |
| Alto | Nenhum envio real controlado foi executado | Publicar uma mensagem em destino Telegram exclusivo de homologação |
| Médio | CSP estrita ainda não configurada | Definir política com nonce após inventário de scripts/fontes do deploy |
| Médio | Alertas ainda não estão ligados a um provedor | Integrar health endpoints, fila e logs ao monitor escolhido |
| Médio | MFA depende da configuração do Supabase | Tornar MFA obrigatório antes da liberação |

## Checklist de autorização

- [ ] Migrations aplicadas e RLS testada em homologação.
- [ ] Administrador único com MFA.
- [ ] Segredos configurados no provedor, não em arquivos.
- [ ] Backup restaurado com sucesso.
- [ ] Redis privado, TLS e persistência verificados.
- [ ] Worker bootstrap revisado e health checks verdes.
- [ ] Alertas e dead-letter monitorados.
- [ ] Credenciais e políticas de cada marketplace confirmadas.
- [ ] Destino Telegram de teste autorizado.
- [ ] E2E real de uma oferta executado sem duplicação.
- [ ] WhatsApp mantido desativado salvo elegibilidade documentada.
- [ ] Mercado Livre bloqueado para grupos privados quando aplicável.
- [ ] `ENABLE_DEMO_MODE=false` em produção.
- [ ] Pausa global desativada somente por aprovação explícita registrada.
