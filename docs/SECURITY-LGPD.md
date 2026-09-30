# Segurança e LGPD — baseline operacional

Atualizado em 30/09/2026. Este documento registra controles técnicos e procedimentos mínimos. Ele não substitui inventário jurídico, definição de bases legais, contratos, RIPD nem avaliação do encarregado.

## Controles aplicados

- Sessões em cookies `HttpOnly`, `Secure` em produção e validação do usuário ativo no banco a cada requisição.
- Proteção contra CSRF por validação de origem em operações mutáveis autenticadas por cookie.
- CORS explícito, CSP, HSTS, proteção contra framing, política de referência e restrição de permissões no proxy e na API.
- Limites de corpo e upload, validação de imagens e negação de arquivos ocultos.
- Rate limit de login com identificador pseudonimizado e sem penalizar autenticações bem-sucedidas.
- Segredos obrigatórios em produção, sem valores padrão no compose, e chave exclusiva para integrações.
- Logs de auditoria sem resposta completa e com remoção recursiva de senha, token, segredo, CPF e cartão.
- Operações de configuração/integradores limitadas a gerente ou administrador.
- Dependências de produção atualizadas; advisories residuais ficam registrados na seção de riscos.

## Governança de dados

Manter um inventário por finalidade contendo: categoria de dado, titular, origem, controlador/operador, base legal, compartilhamentos, localização, prazo de retenção e forma de descarte. Dados hoje observados incluem cadastro e contato, CPF, endereços, veículos, pedidos, pagamentos, atendimentos, fidelidade, telemetria de acesso e dados de integrações.

Colete apenas dados necessários. Campos opcionais não devem ser transformados em obrigatórios sem revisão de finalidade e base legal. Dados reais não podem ser usados em desenvolvimento, demonstrações ou logs.

As rotinas atuais removem notificações após `NOTIFICATION_RETENTION_DAYS` (padrão 90) e auditoria após `AUDIT_LOG_RETENTION_DAYS` (padrão 365). Os demais prazos precisam ser aprovados por categoria, considerando obrigações fiscais, consumeristas e exercício regular de direitos. O descarte deve alcançar réplicas e backups conforme a janela documentada.

## Direitos do titular

Publicar um canal autenticável para confirmação, acesso, correção, portabilidade, informação, oposição, revogação e eliminação quando aplicável. Cada solicitação deve ter protocolo, identidade validada proporcionalmente ao risco, prazo, decisão, fundamento, responsável e trilha de atendimento. Nunca enviar exportações pessoais por canal não autenticado.

Antes de eliminar ou anonimizar, verificar retenções legais e vínculos transacionais. Revogação de consentimento não implica apagar dados mantidos sob outra base legal válida.

## Incidentes

1. Conter o evento sem destruir evidências; registrar horário, sistemas, dados, titulares e medidas.
2. Acionar responsável de segurança, controlador e encarregado; avaliar risco ou dano relevante.
3. Quando aplicável, comunicar ANPD e titulares em até 3 dias úteis, usando o canal oficial vigente.
4. Manter o registro do incidente por pelo menos 5 anos, inclusive quando não houver comunicação.
5. Corrigir a causa, rotacionar credenciais, testar restauração e registrar lições aprendidas.

## Checklist de operação

- Rotacionar imediatamente qualquer segredo que já tenha sido exposto e manter segredos fora do Git.
- Executar `npm audit --omit=dev`, testes e build em cada entrega; adicionar análise de código e segredo no CI.
- Revisar trimestralmente acessos administrativos e integrações; revogar contas inativas imediatamente.
- Testar restauração de backup e resposta a incidente ao menos semestralmente.
- Formalizar contratos com operadores (hospedagem, e-mail, pagamentos e marketplaces), inclusive suboperadores e transferência internacional.
- Definir encarregado/canal, aviso de privacidade, política de retenção e RIPD para tratamentos de maior risco.

## Riscos residuais conhecidos

- `react-router-dom` 6 possui advisory moderado sem correção compatível na linha 6; a atualização segura exige migração testada para a linha 7. Não construir destinos de navegação a partir de entrada não confiável até a migração.
- Conformidade depende de processos externos ao código: bases legais, transparência, contratos, atendimento de titulares, gestão de fornecedores e decisões de retenção ainda exigem validação organizacional e jurídica.
- Testes de intrusão, varredura de contêiner/infraestrutura e revisão das regras do provedor devem complementar esta auditoria de código.
