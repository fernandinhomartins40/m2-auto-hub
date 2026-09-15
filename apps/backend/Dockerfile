# PLANO ITEM 3: a base era mcr.microsoft.com/playwright:v1.59.1-jammy (3,2 GB),
# que traz Chromium, Firefox, WebKit e todo o ferramental de teste. O unico
# consumidor de Playwright aqui e a geracao de PDF (pdf-generator.service.ts),
# que chama `chromium.launch({ headless: true })` - ou seja, usa apenas o
# headless shell.
#
# node:20-slim + `playwright install --with-deps --only-shell chromium` instala
# o mesmo binario e as bibliotecas de sistema que ele exige (o --with-deps e o
# que evita a armadilha classica de faltar lib em runtime). Medido na VPS:
# 3,2 GB -> 1,14 GB de imagem base, com /ms-playwright caindo de 1,2 GB para
# 262 MB. Validado gerando um PDF real: mesmos 12.084 bytes da base anterior.
#
# A versao do pacote npm `playwright` (package.json) e a instalada aqui devem
# ser sempre a mesma - o binario do navegador e casado com a versao do cliente.
FROM node:20-slim AS base
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# openssl: exigido pelo Prisma. curl: usado pelo healthcheck do compose.
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN npx --yes playwright@1.59.1 install --with-deps --only-shell chromium \
    && rm -rf /root/.npm /var/lib/apt/lists/*

FROM base AS deps
# O lockfile e copiado junto e o install e `npm ci`: sem ele, cada build
# re-resolvia as dependencias do zero (19 das 20 usam `^`), e uma versao
# publicada no npm entrava no build sem revisao. Foi assim que o backend quebrou
# sem que uma linha do seu codigo mudasse. `npm ci` falha se o lockfile estiver
# fora de sincronia com o package.json, o que e o comportamento desejado.
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

# Arvore de dependencias so de producao. O estagio `deps` acima instala tudo
# porque o build precisa do TypeScript; a imagem final, nao. Das 627 entradas do
# lockfile, 435 sao exclusivas de desenvolvimento (typescript, jest, eslint,
# prettier, ts-jest, @types/*) - 69% da arvore que antes ia para producao sem
# nunca ser carregada em runtime.
#
# O cliente do Prisma e gerado no estagio de build, entao e copiado de la: um
# `npm ci --omit=dev` limpo nao contem o cliente gerado.
FROM base AS prod-deps
COPY package.json package-lock.json ./
# --ignore-scripts: o postinstall do @prisma/client tenta gerar o cliente, e
# aqui nao existe schema.prisma (so os manifestos foram copiados). O cliente
# gerado vem do estagio `build`, copiado logo abaixo.
RUN npm ci --omit=dev --ignore-scripts --prefer-offline --no-audit --no-fund

FROM base AS production
ENV NODE_ENV=production
ARG RELEASE_VERSION=local

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
# O volume uploads_data monta por cima deste diretorio em runtime; ele so
# precisa existir para o caso de rodar sem volume.
RUN mkdir -p uploads && printf '%s\n' "$RELEASE_VERSION" > /app/.release-version

EXPOSE 3001
CMD ["node", "dist/server.js"]
