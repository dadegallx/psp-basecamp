#!/bin/bash
# Initialize Let's Encrypt SSL certificates for Superset
#
# Usage:
#   ./scripts/init-letsencrypt.sh
#
# Prerequisites:
#   - Domain DNS must point to this server
#   - docker/.env must be configured with DOMAIN_NAME and TLS_EMAIL
#   - Ports 80 and 443 must be open

set -e

# Load environment variables
if [ -f docker/.env ]; then
    export $(grep -v '^#' docker/.env | xargs)
fi

# Configuration
DOMAIN="${DOMAIN_NAME:-povertystoplight.vetta.so}"
EMAIL="${TLS_EMAIL:-}"
STAGING="${STAGING:-0}"  # Set to 1 for testing (avoid rate limits)
RSA_KEY_SIZE=4096

echo "=============================================="
echo "Let's Encrypt SSL Certificate Initialization"
echo "=============================================="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $STAGING"
echo ""

# Validate configuration
if [ -z "$EMAIL" ]; then
    echo "Error: TLS_EMAIL not set in docker/.env"
    echo "Please add: TLS_EMAIL=your-email@example.com"
    exit 1
fi

# Create required directories
mkdir -p certbot/conf
mkdir -p certbot/www

# Check if certificates already exist
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "Certificates already exist for $DOMAIN"
    read -p "Do you want to regenerate them? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing certificates."
        exit 0
    fi
fi

# Create a temporary nginx config for ACME challenge
echo "Creating temporary nginx configuration..."
mkdir -p nginx/conf.d
cat > nginx/conf.d/superset.conf << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Waiting for SSL certificate...';
        add_header Content-Type text/plain;
    }
}
NGINX_CONF

# Download recommended TLS parameters
if [ ! -f "certbot/conf/options-ssl-nginx.conf" ]; then
    echo "Downloading recommended TLS parameters..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
fi

if [ ! -f "certbot/conf/ssl-dhparams.pem" ]; then
    echo "Downloading DH parameters..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
fi

# Create dummy certificate for nginx to start
echo "Creating dummy certificate for initial nginx startup..."
CERT_PATH="certbot/conf/live/$DOMAIN"
mkdir -p "$CERT_PATH"
openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout "$CERT_PATH/privkey.pem" \
    -out "$CERT_PATH/fullchain.pem" \
    -subj "/CN=localhost" 2>/dev/null

# Start nginx with temporary config
echo "Starting nginx..."
docker compose -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
echo "Waiting for nginx to start..."
sleep 5

# Delete dummy certificate
echo "Removing dummy certificate..."
rm -rf "$CERT_PATH"

# Request real certificate
echo "Requesting Let's Encrypt certificate..."

STAGING_ARG=""
if [ "$STAGING" = "1" ]; then
    echo "Using staging environment (for testing)"
    STAGING_ARG="--staging"
fi

docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    $STAGING_ARG

# Restore production nginx config
echo "Restoring production nginx configuration..."
cat > nginx/conf.d/superset.conf << 'NGINX_CONF'
# Superset Production Nginx Configuration
# SSL + Widget Injection + Reverse Proxy

upstream superset_app {
    server superset:8088;
    keepalive 100;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name povertystoplight.vetta.so;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name povertystoplight.vetta.so;

    # SSL certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/povertystoplight.vetta.so/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/povertystoplight.vetta.so/privkey.pem;

    # SSL configuration (Mozilla Modern)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Health check endpoint
    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }

    # API endpoints - proxy directly without modification
    location /api/ {
        proxy_pass http://superset_app;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_connect_timeout 300;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }

    # Static assets - proxy directly
    location /static/ {
        proxy_pass http://superset_app;
        proxy_set_header Host $http_host;
        proxy_cache_valid 200 1d;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Main application - HTML pages with widget injection
    location / {
        proxy_pass http://superset_app;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_connect_timeout 300;
        proxy_read_timeout 300;
        proxy_send_timeout 300;

        # Disable gzip from upstream so sub_filter can work on HTML
        proxy_set_header Accept-Encoding "";

        # Chat Widget Injection
        sub_filter '</body>' '<script src="https://chat.povertystoplight.vetta.so/widget.js"></script></body>';
        sub_filter_once on;
        sub_filter_types text/html;

        # Content Security Policy
        proxy_hide_header Content-Security-Policy;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://chat.povertystoplight.vetta.so; frame-src 'self' https://chat.povertystoplight.vetta.so; img-src 'self' blob: data: https://apachesuperset.gateway.scarf.sh https://static.scarf.sh; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.mapbox.com https://events.mapbox.com; worker-src 'self' blob:; object-src 'none';" always;
    }
}
NGINX_CONF

# Reload nginx with new certificate
echo "Reloading nginx with SSL certificate..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo ""
echo "=============================================="
echo "SSL Certificate successfully obtained!"
echo "=============================================="
echo ""
echo "You can now start the full stack with:"
echo "  docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "Certificates will auto-renew via the certbot container."
