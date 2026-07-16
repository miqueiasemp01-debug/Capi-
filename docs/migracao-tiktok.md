# Migração para TikTok Mini Games — estado e dados necessários

## Preparado no código

- build HTML específico (`npm run build:tiktok`) com caminhos relativos;
- Mini Games SDK como primeiro script do pacote TikTok;
- `minigame.config.json` vertical e copiado para `dist-tiktok`;
- progresso de carregamento enviado ao container;
- ponte de login silencioso sem expor tokens ou `client_secret`;
- rewarded `2× TUDO`: duplica capim e gemas realmente recebidos, uma vez;
- validação de `isEnded === true`, cancelamento, erro e callback repetido;
- verificador de APIs proibidas e estrutura básica do pacote.

O build normal do GitHub Pages não carrega o SDK e continua independente.

## Dados que o dono precisa obter no Developer Portal

1. Organização com verificação empresarial e qualificação de Mini Games.
2. Aplicativo Mini Game e região Brasil habilitada.
3. `clientKey` do aplicativo.
4. IAA habilitado e `adUnitId` de um rewarded video.
5. Conta TikTok adicionada como test user do Sandbox.
6. Apple Team ID para acesso pelo iPhone.
7. Nome/razão social do operador, CNPJ e e-mail de suporte/privacidade.

Copiar `.env.tiktok.example` para `.env.tiktok.local` e preencher somente os
identificadores públicos. Nunca colocar `client_secret`, access token ou chave
do backend no repositório, no bundle ou no chat.

## Backend ainda necessário

- endpoint HTTPS de sessão TikTok para trocar o `code` por OpenID/tokens;
- sessão HttpOnly, validação de origem/estado e renovação após 401;
- save espelhado e economia validada no servidor;
- criação de pedido da Serena e webhook idempotente do TikTok Beans;
- domínio cadastrado na allowlist de Security do Developer Portal.

## Antes de submeter

- gerar termos de uso e política de privacidade com os dados reais do operador;
- configurar ícone, descrição, imagens de compartilhamento e localização PT-BR;
- executar `npm run build:tiktok` e `npm run verificar:tiktok`;
- rodar a ferramenta oficial `@ttmg/cli` para criar o manifest e abrir o DevTool;
- testar login, anúncio concluído/cancelado/erro, save e compra no Sandbox por QR;
- somente então importar a configuração do Sandbox e enviar para revisão.
