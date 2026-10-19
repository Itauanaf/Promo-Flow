# Implantação

## 1. Supabase

1. Crie projetos separados para homologação e produção na região apropriada.
2. Desabilite cadastro público e habilite MFA para o administrador.
3. Aplique as migrations em ordem e execute `pnpm migrations:validate` antes do deploy.
4. Crie manualmente o usuário administrador e o perfil correspondente conforme `docs/database.md`.
5. Confirme RLS usando uma sessão `anon`, uma sessão autenticada não administradora e a sessão administradora.
6. Ative PITR/backups e restaure uma cópia em homologação antes da liberação.

## 2. Vercel

Crie um projeto com **Root Directory** `apps/web`, framework Next.js e região `gru1`. Configure somente no painel:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `ADMIN_EMAIL`;
- credenciais server-only necessárias às integrações.

Defina `ENABLE_DEMO_MODE=false`. Nunca configure `SUPABASE_SERVICE_ROLE_KEY` como variável pública. O arquivo `apps/web/vercel.json` fixa framework e região. Restrinja acesso ao projeto e previews à conta administradora.

## 3. Worker persistente

Execute `apps/worker/Dockerfile` em VPS ou serviço persistente com rede privada para Redis e banco. A Vercel não hospeda este processo.

Antes de iniciar, implemente o bootstrap específico do ambiente que compõe `ProcessorDependencies` com banco e conectores reais. O repositório falha fechado e não inicia envios somente com `RUN_PROMOFLOW_WORKER=true`.

Exponha `/health/live` e `/health/ready` apenas para o balanceador/monitor. Configure alertas para:

- readiness indisponível por cinco minutos;
- crescimento da dead-letter queue;
- jobs travados ou fila sem consumo;
- falhas 401/403 de conectores;
- 429 recorrentes;
- tentativas de login e alterações sensíveis.

## 4. Redis

Use TLS, senha forte, persistência AOF e acesso restrito ao worker. `docker-compose.yml` é apenas para desenvolvimento local e publica Redis somente em `127.0.0.1`.

## 5. Liberação

Inicie em modo manual com um destino Telegram de homologação. A automação global permanece desativada. Após validar uma publicação ponta a ponta, aprove explicitamente o destino e somente então altere para semiautomático. Modo automático requer nova aprovação registrada em auditoria.
