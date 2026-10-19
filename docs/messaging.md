# Telegram e WhatsApp

Status revisado em 19 de outubro de 2026.

## Telegram

O `TelegramConnector` usa exclusivamente a Bot API HTTP oficial:

- `getMe` valida o token e identifica o bot;
- `getChatMember` consulta a participação e permissões no destino;
- `sendMessage` publica texto e links;
- `sendPhoto` publica imagem por URL com legenda;
- o `message_id` retornado é preservado como `externalMessageId`;
- respostas 429 respeitam `parameters.retry_after` antes de tentar novamente.

O token fica somente em `TELEGRAM_BOT_TOKEN` no servidor ou deve ser referenciado no armazenamento privado de segredos. URLs de erro, logs e auditoria nunca devem incluir o token, pois ele integra o caminho da Bot API.

Para cadastrar um destino, adicione o bot ao grupo/canal, conceda a permissão de publicar e execute a verificação. Um envio de teste deve ser iniciado por ação explícita do administrador e somente quando `test_destination=true`. A pausa por destino usa `paused_at`; qualquer valor não nulo bloqueia o envio.

## WhatsApp

Estados possíveis:

- `not_configured`: nenhuma conta vinculada;
- `pending_eligibility`: conta presente, mas grupos/permissões ainda não confirmados;
- `available`: elegibilidade e permissão explicitamente confirmadas;
- `unavailable`: recurso não concedido à conta.

Mesmo em `available`, o conector desta etapa não envia mensagens até que a integração específica da conta seja implementada e testada. `send()` retorna falha explícita; nunca há simulação de sucesso. `prepareManual()` prepara texto e link para cópia manual.

Não são permitidos WhatsApp Web automatizado, bibliotecas não oficiais, rotação de números ou contorno de limites.

## Registro de tentativas

Cada execução deve criar `publication_attempts` com código e erro sanitizado. Sucesso cria `publications` com o ID externo da mensagem, oferta, link afiliado e destino utilizados. Resultados desconhecidos não devem ser reenviados automaticamente antes de reconciliação.

## Fontes oficiais

- Telegram Bot API: https://core.telegram.org/bots/api
- Meta WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Grupos na Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/groups/
