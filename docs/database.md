# Banco de dados

## Responsabilidades

O schema fica em `packages/database/src/schema.ts`; a migration SQL revisável fica em `supabase/migrations`. Alterações devem começar no schema Drizzle e gerar uma nova migration — migrations aplicadas nunca devem ser editadas.

Relações principais:

```text
products → offers → promotion_drafts → publication_jobs → publications
    │          │              │                 │               │
    └ affiliate_links ────────┘          destinations       click_events
               │
       affiliate_accounts
```

Cada `publication` preserva a oferta, o link afiliado e o destino efetivamente usados. `publication_jobs.idempotency_key` impede a criação duplicada do mesmo envio. `audit_logs` é append-only.

## Provisionamento do administrador

1. Desative novos cadastros em **Supabase → Authentication → Providers → Email**.
2. Crie manualmente o único usuário administrador.
3. Em uma sessão SQL confiável, insira o mesmo UUID em `public.profiles`:

```sql
insert into public.profiles (id, display_name, role)
values ('UUID-DE-AUTH-USERS', 'Administrador', 'admin');
```

O índice `profiles_single_admin_uidx` impede um segundo perfil administrador. A aplicação também compara a sessão com `ADMIN_EMAIL`.

## Segredos

`store_integrations.credential_ref` contém apenas uma referência opaca. O material cifrado fica em `private.integration_secrets`, schema sem acesso para `anon` e `authenticated`, ou em um secret manager externo. Nunca registre tokens em `audit_logs`, respostas de tentativas ou mensagens de erro.

## Backup e restauração

- Ative os backups gerenciados/PITR adequados ao plano do Supabase.
- Faça um dump lógico criptografado antes de cada migration de produção.
- Mantenha pelo menos uma cópia fora do provedor, com retenção definida.
- Trimestralmente, restaure o backup em um projeto isolado e valide contagens, FKs, RLS e autenticação.

Exemplo operacional (credenciais fornecidas via ambiente, nunca no histórico do shell):

```bash
pg_dump --format=custom --no-owner --file=promoflow.dump "$DATABASE_URL"
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" promoflow.dump
```

Após restaurar, rode `pnpm db:check` e os testes de integração contra o ambiente isolado. Nunca teste restauração sobre produção.
