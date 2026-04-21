# M2 Auto Hub

Workspace reorganizado como monorepo Turbo, mantendo apenas:

- `apps/frontend`: frontend principal da M2 em React/Vite.
- `apps/backend`: backend herdado e isolado da base `moria-6df9f9ce`.
- `services/alpr-service`: microservico auxiliar de leitura de placas.
- `infra/nginx`: gateway reverso interno para o stack Docker.

## Estrutura

```text
apps/
  backend/
  frontend/
infra/
  nginx/
services/
  alpr-service/
docker-compose.yml
package.json
turbo.json
```

## Desenvolvimento local

```sh
npm install
npm run dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:3001`

## Stack Docker

```sh
cp .env.example .env
docker compose up --build
```

Gateway nginx: `http://localhost:8080`

Roteamento interno:

- `/` -> `frontend:3000`
- `/api/*` -> `backend:3001`
- `/uploads/*` -> `backend:3001`

## Observacoes

- O backend usa Prisma e aplica `migrate deploy` ao iniciar no container.
- Os uploads ficam persistidos em `apps/backend/uploads`.
- O frontend da M2 permanece como unica interface do projeto.

## Deploy de producao

- Workflow: `.github/workflows/deploy-production.yml`
- VPS: `72.60.10.112`
- Porta externa local na VPS: `7001`
- Dominios: `m2centerauto.com.br` e `www.m2centerauto.com.br`
- Secret exigida no GitHub: `VPS_PASSWORD`

O deploy sobe o stack via `docker-compose.production.yml`, publica o gateway apenas em `127.0.0.1:7001` e deixa o Nginx da VPS fazer o proxy reverso e o SSL.
