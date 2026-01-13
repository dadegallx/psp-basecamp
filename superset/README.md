# Poverty Stoplight - Superset Deployment

This directory contains Docker configuration to run Apache Superset with the chat widget integration.

- **Local Development**: `docker-compose.yml`
- **Production**: `docker-compose.prod.yml`

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │  Nginx (SSL + Widget Injection)              │
   HTTPS :443 ────▶ │  - Let's Encrypt SSL via Certbot            │
                    │  - Injects chat widget into HTML pages       │
                    └──────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Docker Compose Stack                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ superset:8088   │  │ superset-worker │  │ superset-beat   │    │
│  │ (gunicorn)      │  │ (celery)        │  │ (scheduler)     │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                              │                                      │
│                       ┌──────┴──────┐                               │
│                       │    Redis    │                               │
│                       └─────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                    ┌──────────────────────────────────────────────┐
                    │  DigitalOcean Managed PostgreSQL             │
                    │  (Existing database with users/dashboards)   │
                    └──────────────────────────────────────────────┘
```

---

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ and pnpm (for the chatbot)

### Quick Start

```bash
# 1. Start the chatbot (from repo root)
pnpm install && pnpm dev
# Chatbot runs on http://localhost:3000

# 2. Start Superset (from this directory)
cp docker/.env.example docker/.env
docker compose up -d
# Superset runs on http://localhost
```

**Default credentials:** admin / admin

---

## Production Deployment

### 1. Provision a new DigitalOcean Droplet

```bash
doctl compute droplet create superset-new \
  --region lon1 \
  --size s-2vcpu-4gb \
  --image ubuntu-24-04-x64 \
  --ssh-keys <your-ssh-key-id>
```

### 2. Setup the droplet

```bash
# SSH into the droplet
ssh root@<droplet-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone the repository
git clone https://github.com/your-org/psp-basecamp.git
cd psp-basecamp/superset
```

### 3. Configure environment

```bash
# Copy and edit environment file
cp docker/.env.example docker/.env
nano docker/.env

# Required values to change:
# - SECRET_KEY (generate with: openssl rand -base64 42)
# - DATABASE_PASSWORD (from DO dashboard)
# - DATABASE_HOST (from DO dashboard)
# - TLS_EMAIL (your email for Let's Encrypt)
```

### 4. Initialize SSL certificates

```bash
# Point DNS to this server first, then run:
./scripts/init-letsencrypt.sh
```

### 5. Start the stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 6. Verify deployment

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f superset

# Test health endpoint
curl -k https://localhost/health
```

---

## Files Overview

| File | Description |
|------|-------------|
| `docker-compose.yml` | Local development configuration |
| `docker-compose.prod.yml` | Production Docker Compose configuration |
| `docker/.env.example` | Environment variables template |
| `docker/pythonpath/superset_config.py` | Superset Python configuration |
| `nginx/nginx.conf` | Main Nginx configuration |
| `nginx/conf.d/superset.conf` | Nginx server block with SSL + widget injection |
| `nginx/templates/superset.conf.template` | Local dev nginx template |
| `scripts/init-letsencrypt.sh` | SSL certificate initialization script |

---

## Environment Variables

### Required for Production

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Flask secret key (generate with `openssl rand -base64 42`) |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `DATABASE_HOST` | PostgreSQL host |
| `TLS_EMAIL` | Email for Let's Encrypt notifications |

### Database Connection

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_DIALECT` | postgresql | Database type |
| `DATABASE_USER` | doadmin | Database username |
| `DATABASE_PORT` | 25060 | Database port |
| `DATABASE_DB` | defaultdb | Database name |
| `DATABASE_SSL_MODE` | require | SSL mode (require for DO Managed) |

---

## Migration from Old Deployment

### Before Migration

1. **Lower DNS TTL** in Cloudflare to 60 seconds (do this 24h before)

### Migration Steps

1. Deploy new droplet (steps above)
2. Test via IP address: `http://<new-droplet-ip>`
3. Verify login with existing credentials
4. Verify dashboards load correctly
5. Update Cloudflare A record to new IP
6. Wait for propagation
7. Test via domain
8. Keep old droplet for 24-48h as rollback
9. Destroy old droplet when confirmed stable

### Rollback

If issues occur:
1. Revert Cloudflare A record to old droplet IP
2. Old droplet remains running with same DB

---

## Chat Widget

The chat widget is injected into all HTML pages via Nginx `sub_filter`:

```nginx
sub_filter '</body>' '<script src="https://chat.povertystoplight.vetta.so/widget.js"></script></body>';
```

The widget loads from Vercel and displays a floating chat button that opens the AI chatbot in an iframe.

### Disabling Widget

Comment out the `sub_filter` line in `nginx/conf.d/superset.conf` and reload:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## Common Commands

### Local Development

```bash
docker compose up -d              # Start
docker compose down               # Stop
docker compose down -v            # Stop and reset data
docker compose logs -f superset   # View logs
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d        # Start
docker compose -f docker-compose.prod.yml down         # Stop
docker compose -f docker-compose.prod.yml logs -f      # All logs
docker compose -f docker-compose.prod.yml restart      # Restart all
```

### Superset CLI

```bash
docker compose exec superset superset --help
docker compose exec superset superset shell
```

---

## Troubleshooting

### Container won't start

```bash
docker compose -f docker-compose.prod.yml logs superset-init
docker compose -f docker-compose.prod.yml logs superset
```

### Database connection failed

```bash
docker compose -f docker-compose.prod.yml exec superset \
  python -c "from superset_config import SQLALCHEMY_DATABASE_URI; print(SQLALCHEMY_DATABASE_URI)"
```

### SSL certificate issues

```bash
# Check certbot logs
docker compose -f docker-compose.prod.yml logs certbot

# Manual renewal
docker compose -f docker-compose.prod.yml run --rm certbot renew

# Regenerate certificate (test first)
STAGING=1 ./scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh
```

### Widget not appearing

1. Check browser console for CSP errors
2. Verify widget.js is accessible: `curl https://chat.povertystoplight.vetta.so/widget.js`
3. Check Nginx sub_filter is working: `curl -s https://yoursite.com | grep widget.js`

---

## Updating Superset

```bash
# Edit docker/.env
SUPERSET_VERSION=6.0.0

# Pull and restart
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
