# Banco de dados

## Ambiente local

O banco local usa a stack oficial do Supabase, configurada em `supabase/config.toml`, porque as migrations dependem do schema `auth` e das roles `anon` e `authenticated`. Docker Desktop (ou outro runtime compatível) precisa estar em execução.

```bash
pnpm install
pnpm db:start
pnpm db:reset
pnpm db:status
```

`db:start` aplica as migrations e o seed. Use `db:reset` quando precisar recriar o banco do zero. Copie a URL e as chaves exibidas por `db:status` para `.env.local`; a conexão Postgres local padrão já está documentada em `.env.example`. Cadastros ficam desativados também no ambiente local.

Para encerrar a stack, execute `pnpm db:stop`. Antes de enviar alterações de banco, rode `pnpm migrations:validate`, `pnpm db:check` e `pnpm db:lint`.

## Migração para um projeto Supabase remoto

### Pré-requisitos

1. Crie um projeto de **homologação** no Supabase e copie o `Project ref` em **Project Settings → General**.
2. Em **Authentication → Providers → Email**, desative novos cadastros antes de expor a aplicação.
3. Não coloque access token, senha do banco nem `service_role` em arquivos versionados. A CLI solicita esses valores e mantém sua própria sessão local.

### Vincular e conferir

Execute na raiz do repositório:

```bash
pnpm db:login
pnpm db:link --project-ref SEU_PROJECT_REF
pnpm migrations:validate
pnpm db:remote:status
pnpm db:remote:plan
```

`db:remote:plan` é obrigatório antes da aplicação: ele mostra quais migrations serão enviadas sem alterar o banco. Confirme que aparecem somente os arquivos esperados de `supabase/migrations`.

### Aplicar

Depois de revisar o dry-run e garantir que o projeto vinculado é o de homologação:

```bash
pnpm db:remote:push
pnpm db:remote:status
```

A CLI registra cada arquivo aplicado em `supabase_migrations.schema_migrations`, portanto execuções posteriores enviam somente migrations novas. Nunca renomeie nem edite uma migration já aplicada; crie outra com um timestamp maior.

### Configurar a aplicação

Copie `.env.example` para `apps/web/.env.local` e preencha os valores do painel em **Project Settings → API**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE_ANON_OU_PUBLISHABLE
SUPABASE_SERVICE_ROLE_KEY=CHAVE_SERVICE_ROLE
ADMIN_EMAIL=seu-admin@dominio.com
ENABLE_DEMO_MODE=false
```

Use `SUPABASE_SERVICE_ROLE_KEY` apenas em processos server-side que realmente precisem dela. Para o worker, configure `DATABASE_URL` diretamente no gerenciador de segredos do ambiente, com `sslmode=require`; prefira a URL do pooler em modo transação para execução normal. A conexão direta é apropriada para ferramentas de migration quando houver suporte de rede/IPv6.

Após configurar o ambiente, crie manualmente o administrador e execute a matriz de testes RLS descrita abaixo. Faça a primeira aplicação em homologação; produção deve usar outro projeto e repetir `link`, dry-run e aprovação do plano.

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
