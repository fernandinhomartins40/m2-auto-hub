#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PORT="${DEPLOY_PORT:-7001}"
PRIMARY_DOMAIN="${PRIMARY_DOMAIN:-m2centerauto.com.br}"
SECONDARY_DOMAIN="${SECONDARY_DOMAIN:-www.m2centerauto.com.br}"
CANONICAL_URL="${CANONICAL_URL:-https://www.m2centerauto.com.br}"
SSL_EMAIL="${SSL_EMAIL:-admin@m2centerauto.com.br}"

mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot

# HTTP config (always applied first)
{
  printf 'server {\n'
  printf '    listen 80;\n'
  printf "    server_name %s %s;\n" "$PRIMARY_DOMAIN" "$SECONDARY_DOMAIN"
  printf '    client_max_body_size 25m;\n'
  printf '    location /.well-known/acme-challenge/ { root /var/www/certbot; }\n'
  printf '    location / {\n'
  printf "        proxy_pass http://127.0.0.1:%s;\n" "$DEPLOY_PORT"
  printf '        proxy_http_version 1.1;\n'
  printf '        proxy_set_header Upgrade $http_upgrade;\n'
  printf '        proxy_set_header Connection "upgrade";\n'
  printf '        proxy_set_header Host $host;\n'
  printf '        proxy_set_header X-Real-IP $remote_addr;\n'
  printf '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
  printf '        proxy_set_header X-Forwarded-Proto $scheme;\n'
  printf '        proxy_read_timeout 86400;\n'
  printf '    }\n'
  printf '}\n'
} > /etc/nginx/sites-available/m2centerauto

ln -sf /etc/nginx/sites-available/m2centerauto /etc/nginx/sites-enabled/m2centerauto
nginx -t && systemctl reload nginx
echo "Nginx HTTP OK"

# Try to obtain SSL certificate
if [ ! -f "/etc/letsencrypt/live/${PRIMARY_DOMAIN}/fullchain.pem" ]; then
  certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$PRIMARY_DOMAIN" -d "$SECONDARY_DOMAIN" \
    --email "$SSL_EMAIL" \
    --agree-tos --non-interactive 2>/dev/null || echo "certbot failed, keeping HTTP"
else
  echo "SSL certificate already exists, skipping"
fi

# HTTPS config if cert exists
if [ ! -f "/etc/letsencrypt/live/${PRIMARY_DOMAIN}/fullchain.pem" ]; then
  echo "Nginx OK (HTTP only)"
  exit 0
fi

{
  printf 'server {\n'
  printf '    listen 80;\n'
  printf "    server_name %s %s;\n" "$PRIMARY_DOMAIN" "$SECONDARY_DOMAIN"
  printf '    location /.well-known/acme-challenge/ { root /var/www/certbot; }\n'
  printf "    location / { return 301 %s\$request_uri; }\n" "$CANONICAL_URL"
  printf '}\n'
  printf 'server {\n'
  printf '    listen 443 ssl http2;\n'
  printf "    server_name %s %s;\n" "$PRIMARY_DOMAIN" "$SECONDARY_DOMAIN"
  printf '    client_max_body_size 25m;\n'
  printf "    ssl_certificate /etc/letsencrypt/live/%s/fullchain.pem;\n" "$PRIMARY_DOMAIN"
  printf "    ssl_certificate_key /etc/letsencrypt/live/%s/privkey.pem;\n" "$PRIMARY_DOMAIN"
  printf '    ssl_protocols TLSv1.2 TLSv1.3;\n'
  printf '    ssl_ciphers HIGH:!aNULL:!MD5;\n'
  printf "    if (\$host != \"www.m2centerauto.com.br\") { return 301 %s\$request_uri; }\n" "$CANONICAL_URL"
  printf '    location / {\n'
  printf "        proxy_pass http://127.0.0.1:%s;\n" "$DEPLOY_PORT"
  printf '        proxy_http_version 1.1;\n'
  printf '        proxy_set_header Upgrade $http_upgrade;\n'
  printf '        proxy_set_header Connection "upgrade";\n'
  printf '        proxy_set_header Host $host;\n'
  printf '        proxy_set_header X-Real-IP $remote_addr;\n'
  printf '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
  printf '        proxy_set_header X-Forwarded-Proto $scheme;\n'
  printf '        proxy_read_timeout 86400;\n'
  printf '    }\n'
  printf '}\n'
} > /etc/nginx/sites-available/m2centerauto

nginx -t && systemctl reload nginx
echo "Nginx HTTPS OK"
