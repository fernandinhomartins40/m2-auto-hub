#!/usr/bin/env bash
set -euo pipefail

PRIMARY=m2centerauto.com.br
SECONDARY=www.m2centerauto.com.br
CANONICAL=https://www.m2centerauto.com.br
PORT=7001

mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot

cat > /etc/nginx/sites-available/m2centerauto <<NGINX
server {
    listen 80;
    server_name $PRIMARY $SECONDARY;
    client_max_body_size 25m;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/m2centerauto /etc/nginx/sites-enabled/m2centerauto
nginx -t && systemctl reload nginx

if [ ! -f "/etc/letsencrypt/live/$PRIMARY/fullchain.pem" ]; then
  certbot certonly --webroot -w /var/www/certbot \
    -d "$PRIMARY" -d "$SECONDARY" \
    --email admin@m2centerauto.com.br \
    --agree-tos --non-interactive 2>/dev/null || echo "certbot failed, keeping HTTP"
fi

if [ -f "/etc/letsencrypt/live/$PRIMARY/fullchain.pem" ]; then
  cat > /etc/nginx/sites-available/m2centerauto <<NGINX
server {
    listen 80;
    server_name $PRIMARY $SECONDARY;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 $CANONICAL\$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name $PRIMARY $SECONDARY;
    client_max_body_size 25m;
    ssl_certificate /etc/letsencrypt/live/$PRIMARY/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$PRIMARY/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    if (\$host != "www.m2centerauto.com.br") { return 301 $CANONICAL\$request_uri; }
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
NGINX
  nginx -t && systemctl reload nginx
fi

echo "Nginx OK"
