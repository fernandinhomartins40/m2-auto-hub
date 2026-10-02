# Recuperação de senha administrativa

Deploys e seeds nunca alteram senhas de contas existentes. `DEFAULT_ADMIN_PASSWORD`
é usado somente para criar o primeiro SUPER_ADMIN quando o banco está vazio.

## Usuário ainda autenticado

No painel, acesse **Minha conta > Segurança**, informe a senha atual e escolha a
nova senha.

## Último administrador sem acesso

Na VPS, execute o script individual abaixo. A senha é lida pela entrada padrão e
não aparece nos argumentos do processo nem nos logs da aplicação:

```bash
read -rsp 'Nova senha: ' NEW_ADMIN_PASSWORD && echo
printf '%s' "$NEW_ADMIN_PASSWORD" | docker exec -i \
  -e RESET_ADMIN_EMAIL='admin@exemplo.com' \
  m2centerauto-backend-1 node dist/scripts/reset-admin-password.js
unset NEW_ADMIN_PASSWORD
```

A senha deve ter pelo menos 12 caracteres, com letras maiúsculas e minúsculas,
número e caractere especial. O script altera somente a conta indicada e preserva
seu status e suas permissões.

Se a conta estiver inativa, a ativação deve ser uma ação separada de um
SUPER_ADMIN; recuperar a senha não contorna o controle de acesso.
