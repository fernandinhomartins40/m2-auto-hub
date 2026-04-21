FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_BASE_URL=/api
ARG RELEASE_VERSION=local
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:1.27-alpine AS production
ARG RELEASE_VERSION=local

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf '%s\n' "$RELEASE_VERSION" > /usr/share/nginx/html/.release-version

EXPOSE 3000
