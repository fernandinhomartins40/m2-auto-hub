# Segurança

## Relato responsável

Não abra uma issue pública para vulnerabilidades. Envie o relato ao canal privado definido pelo responsável da aplicação, com impacto, passos de reprodução e evidências mínimas. Evite copiar dados pessoais reais.

O responsável deve confirmar o recebimento, classificar o risco, preservar evidências e coordenar correção, comunicação e eventual notificação à ANPD e aos titulares.

## Requisitos de produção

- HTTPS obrigatório, cookies `Secure` e origens CORS explícitas.
- Segredos exclusivos e aleatórios para JWT, administrador, banco e criptografia de integrações.
- Backups cifrados, restauração testada e acesso por menor privilégio.
- Dependências, imagens de contêiner e logs monitorados continuamente.
- Acesso administrativo individual; contas compartilhadas e credenciais padrão são proibidas.

Consulte [docs/SECURITY-LGPD.md](docs/SECURITY-LGPD.md) para controles, procedimentos e riscos residuais.
