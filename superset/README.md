# Poverty Stoplight - Superset Deployment

This directory contains Docker configuration to run Apache Superset with the chat widget integration.

- **Local Development**: `docker-compose.yml`
- **Production**: `docker-compose.prod.yml`

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │  Caddy (Auto SSL + Widget Injection)         │
   HTTPS :443 ────▶ │  - Automatic Let's Encrypt SSL              │
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
# - DOMAIN_NAME (your domain)
# - TLS_EMAIL (your email for Let's Encrypt)
```

### 4. Start the stack

```bash
# Point DNS to this server first, then:
docker compose -f docker-compose.prod.yml up -d
```

Caddy will automatically obtain SSL certificates from Let's Encrypt.

### 5. Verify deployment

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f superset

# Test health endpoint
curl https://yourdomain.com/health
```

---

## Files Overview

| File | Description |
|------|-------------|
| `docker-compose.yml` | Local development configuration |
| `docker-compose.prod.yml` | Production Docker Compose configuration |
| `docker/.env.example` | Environment variables template |
| `docker/pythonpath/superset_config.py` | Superset Python configuration |
| `caddy/Dockerfile` | Custom Caddy with replace-response plugin |
| `caddy/Caddyfile.dev` | Caddy config for local dev (no SSL) |
| `caddy/Caddyfile.prod` | Caddy config for production (auto SSL) |

---

## Environment Variables

### Required for Production

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Flask secret key (generate with `openssl rand -base64 42`) |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `DATABASE_HOST` | PostgreSQL host |
| `DOMAIN_NAME` | Your domain (e.g., `povertystoplight.vetta.so`) |
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
2. Test via IP address (Caddy will show certificate warning - that's OK)
3. Point DNS to new droplet IP
4. Wait for propagation (~5 min with low TTL)
5. Verify SSL certificate is issued: `docker compose -f docker-compose.prod.yml logs caddy`
6. Verify login with existing credentials
7. Verify dashboards load correctly
8. Keep old droplet for 24-48h as rollback
9. Destroy old droplet when confirmed stable

### Rollback

If issues occur:
1. Revert Cloudflare A record to old droplet IP
2. Old droplet remains running with same DB

---

## Chat Widget

The chat widget is injected into all HTML pages via Caddy's `replace` directive:

```caddyfile
replace {
    </body> "<script src=\"https://chat.povertystoplight.vetta.so/widget.js\"></script></body>"
}
```

The widget loads from Vercel and displays a floating chat button that opens the AI chatbot in an iframe.

### Disabling Widget

Comment out the `replace` block in `caddy/Caddyfile.prod` and restart:

```bash
docker compose -f docker-compose.prod.yml restart caddy
```

---

## Common Commands

### Local Development

```bash
docker compose up -d              # Start
docker compose down               # Stop
docker compose down -v            # Stop and reset data
docker compose logs -f superset   # View logs
docker compose logs -f caddy      # View Caddy logs
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
# Check Caddy logs for certificate status
docker compose -f docker-compose.prod.yml logs caddy

# Caddy automatically retries certificate issuance
# Ensure DNS is pointing to the server and ports 80/443 are open
```

### Widget not appearing

1. Check browser console for CSP errors
2. Verify widget.js is accessible: `curl https://chat.povertystoplight.vetta.so/widget.js`
3. Check Caddy replace is working: `curl -s https://yoursite.com | grep widget.js`

---

## Updating Superset

```bash
# Edit docker/.env
SUPERSET_VERSION=6.0.0

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Building Custom Caddy Image

The Caddy image includes the `replace-response` plugin for widget injection. To rebuild:

```bash
docker compose -f docker-compose.prod.yml build caddy
```
