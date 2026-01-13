# Superset Local Development

This directory contains configuration to run Apache Superset locally using the official Docker image, with the Poverty Stoplight chat widget automatically injected.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      localhost:80 (nginx)                    │
│                                                              │
│  ┌────────────────┐    ┌─────────────────────────────────┐  │
│  │   sub_filter   │───>│  Injects widget.js into HTML    │  │
│  └────────────────┘    └─────────────────────────────────┘  │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Superset (apache/superset:latest-dev)      │ │
│  │                     localhost:8088                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ iframe
                              ▼
                ┌─────────────────────────────┐
                │   Chatbot (localhost:3000)   │
                │   (runs on host via pnpm)    │
                └─────────────────────────────┘
```

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ and pnpm (for the chatbot)

## Quick Start

### 1. Start the Chatbot (in a terminal)

```bash
# From the repository root (psp-basecamp/main)
pnpm install
pnpm dev
# Chatbot runs on http://localhost:3000
```

### 2. Start Superset (in another terminal)

```bash
# From this directory (psp-basecamp/main/superset)
cp docker/.env.example docker/.env
# Edit docker/.env if needed (defaults work for local dev)

docker compose up -d
```

### 3. Access Superset

Open http://localhost in your browser.

- **Default credentials:** admin / admin
- The chat widget button appears in the bottom-right corner

## First Run

On first run, Superset will:
1. Initialize the database
2. Create the admin user
3. Load example dashboards (if `SUPERSET_LOAD_EXAMPLES=yes`)

This takes 2-3 minutes. Watch progress with:

```bash
docker compose logs -f superset-init
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80 | Reverse proxy with widget injection |
| superset | 8088 | Main Superset application |
| superset-worker | - | Celery worker for async tasks |
| superset-worker-beat | - | Celery beat scheduler |
| db | 5432 | PostgreSQL database |
| redis | 6379 | Cache and message broker |

## Configuration

### Environment Variables

Edit `docker/.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (change me) | Flask secret key |
| `DATABASE_*` | postgres defaults | Database connection |
| `REDIS_*` | redis defaults | Redis connection |
| `SUPERSET_LOG_LEVEL` | INFO | Log verbosity |
| `SUPERSET_LOAD_EXAMPLES` | yes | Load example dashboards |

### Superset Config

Python configuration is in `docker/pythonpath/superset_config.py`:

- Custom color schemes (Poverty Stoplight colors)
- Feature flags
- Celery configuration
- Caching settings

### Nginx / Widget Injection

The widget injection happens in `nginx/templates/superset.conf.template`:

```nginx
sub_filter '</body>' '<script src="http://localhost:3000/widget.js"></script></body>';
```

For production, update the widget URL to your deployed chatbot.

## Common Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f superset

# Stop all services
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v

# Restart a specific service
docker compose restart superset

# Run Superset CLI commands
docker compose exec superset superset --help

# Access Superset shell
docker compose exec superset superset shell
```

## Troubleshooting

### Widget not appearing

1. Ensure the chatbot is running on `localhost:3000`
2. Check browser console for CSP errors
3. Verify nginx is injecting the script: `curl -s http://localhost | grep widget.js`

### Database connection issues

```bash
# Check if postgres is healthy
docker compose exec db pg_isready

# Reset database
docker compose down -v
docker compose up -d
```

### Superset initialization stuck

```bash
# Check init logs
docker compose logs superset-init

# Force restart init
docker compose restart superset-init
```

## Updating Superset

To update to a newer Superset version:

1. Edit `docker-compose.yml` and change the image tag:
   ```yaml
   x-superset-image: &superset-image apache/superset:6.0.0
   ```

2. Recreate containers:
   ```bash
   docker compose down
   docker compose pull
   docker compose up -d
   ```

## Production Deployment

This setup is for local development. For production:

1. Use a managed database (e.g., Amazon RDS, DigitalOcean Managed DB)
2. Use a managed Redis (e.g., Amazon ElastiCache)
3. Update nginx CSP to allow your production chatbot domain
4. Set a strong `SECRET_KEY`
5. Configure proper SSL/TLS termination
