FROM mcr.microsoft.com/playwright:v1.59.1-jammy AS base
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm install --prefer-offline --no-audit --no-fund

FROM deps AS build
COPY . .
RUN mkdir -p uploads
RUN npx prisma generate && npm run build

FROM base AS production
ENV NODE_ENV=production
ARG RELEASE_VERSION=local

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/uploads ./uploads
RUN printf '%s\n' "$RELEASE_VERSION" > /app/.release-version

EXPOSE 3001
CMD ["node", "dist/server.js"]
