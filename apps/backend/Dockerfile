ARG BASE_IMAGE=ghcr.io/fernandinhomartins40/m2-backend-base:latest
FROM ${BASE_IMAGE} AS base

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
