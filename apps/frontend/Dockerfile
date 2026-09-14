FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci --prefer-offline --no-audit --no-fund

COPY apps/frontend ./apps/frontend
COPY packages ./packages

ARG VITE_API_BASE_URL=/api
ARG RELEASE_VERSION=local
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

WORKDIR /repo/apps/frontend
RUN npm run build

FROM nginx:1.27-alpine AS production
ARG RELEASE_VERSION=local

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
RUN printf '%s\n' "$RELEASE_VERSION" > /usr/share/nginx/html/.release-version

# Este nginx e agora a unica porta de entrada do stack: serve o SPA e faz o
# proxy do /api e /uploads para o backend. Antes havia um segundo nginx
# ("gateway") so para repassar o trafego para ca.
EXPOSE 80
