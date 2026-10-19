# E-mails transacionais

O backend usa a API do Velomail com uma chave exclusiva de permissao `email:send`.
Configure `VELOMAIL_API_KEY`, `VELOMAIL_API_URL` e `EMAIL_FROM` no `.env` da VPS
(`/opt/m2centerauto/.env`, modo 600). `APP_BASE_URL` deve apontar para
`https://www.m2centerauto.com.br`. O Compose passa as variaveis somente ao backend.
O deploy normal aplica a migracao `20261018223000_transactional_email`.

## Dominio

`m2centerauto.com.br` foi cadastrado no Velomail (ID 6) e validado em 18/10/2026.
Foram adicionados na Hostinger:

| Host | Tipo | Finalidade |
| --- | --- | --- |
| uz-mail | MX | Return-path para mail.velomail.com.br, prioridade 10 |
| uz-mail | TXT | SPF `v=spf1 a:mail.velomail.com.br -all` |
| default._domainkey | TXT | Chave publica DKIM gerada pelo Velomail |
| _dmarc | TXT | DMARC `p=none`, relatorios para dmarc@velomail.com.br |

Remetente: `nao-responda@m2centerauto.com.br`. Autenticar o dominio para envio
nao cria uma caixa de entrada para esse endereco.

## Fluxos de clientes

- `/recuperar-senha`: solicita um link de redefinicao, valido por 30 minutos.
- `/redefinir-senha#token=...`: salva a senha e invalida sessoes anteriores.
- `/confirmar-email#token=...`: exige confirmacao explicita, com validade de 24 horas.
- Novos cadastros e alteracoes de e-mail enviam confirmacao automaticamente.
- O perfil permite reenviar a confirmacao; contas existentes continuam acessiveis.

Os tokens sao aleatorios (32 bytes), armazenados somente como SHA-256 e consumidos
atomicamente. Os links usam fragmentos para evitar tokens nos logs HTTP. O envio
desabilita rastreamento. A solicitacao de recuperacao tem resposta generica e limite
de requisicoes. Trocar o e-mail invalida links vinculados ao endereco antigo.
Falhas no envio da confirmacao nao desfazem um cadastro concluido; o usuario pode
reenviar pelo perfil. Falhas de recuperacao sao registradas sem e-mail ou token.

## Validacao e operacao

Execute `npm run build --workspace=@m2/backend`,
`npm test --workspace=@m2/backend -- --runInBand` e
`npm run build --workspace=apps/frontend`.

Para validar entrega real, use um destinatario autorizado e confira o resultado
no painel do Velomail e na caixa de entrada. Aceitacao pela API nao comprova entrega.
Clientes usam `/recuperar-senha` e `/redefinir-senha`.
Loja, oficina e equipe usam `/recuperar-senha-admin` e `/redefinir-senha-admin`.
Ambas as telas de login exibem **Recuperar senha por e-mail**.
Os tokens administrativos ficam em tabela separada e deixam de valer se a senha,
o e-mail ou o status da conta mudar. Redefinir a senha invalida sessoes anteriores.
O procedimento `docs/RECUPERACAO-DE-SENHA-ADMIN.md` continua disponivel para
recuperacao operacional quando nao houver acesso ao e-mail cadastrado.

A migracao e aditiva. Em rollback, mantenha as colunas e a tabela de tokens;
restaurar as imagens anteriores nao exige remover dados.

## Publicacao de 18/10/2026

- Release ativa: `/opt/m2centerauto/releases/email-20261018`.
- Imagens: `m2centerauto-backend:email-20261018` e `m2centerauto-frontend:email-20261018`.
- Backup anterior: `/opt/m2centerauto/backups/before-email-20261018.sql.gz` (modo 600).
- Builds de backend/frontend e 17 testes do backend passaram.
- Navegador em producao validou o link de recuperacao, a tela de redefinicao,
  a remocao do token da URL e a rejeicao de confirmacao com token invalido.
- Teste autorizado enviado pelo proprio backend para o e-mail da conta Velomail.
  O provedor registrou a mensagem 19 como `delivered`, sem erro, em 18/10/2026
  as 19h37 (America/Sao_Paulo). Isso nao identifica a pasta de destino na caixa postal.
- A verificacao global `tsc --noEmit` do frontend apontou erros preexistentes
  fora da integracao; o build Vite concluiu com sucesso.

O fluxo normal de publicacao e commit/push para `main`, seguido do workflow
`Deploy Production`. A chave de envio permanece no `.env` da VPS entre deploys.
