FROM mcr.microsoft.com/playwright:v1.59.1-jammy AS base
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

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
