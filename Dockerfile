
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

# Set dummy environment variables for build
ENV NEON_DATABASE_URL="postgres://dummy:dummy@localhost:5432/dummy"
ENV POSTGRES_URL="postgres://dummy:dummy@localhost:5432/dummy"
ENV AUTH_SECRET="dummy_secret"
ENV BLOB_READ_WRITE_TOKEN="dummy_token"
ENV AI_GATEWAY_API_KEY="dummy_key"
ENV REDIS_URL="redis://localhost:6379"

RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for scroll cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration scripts if needed for runtime
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# We use the standalone build, so we start with node server.js
# But we might need to run migrations. 
# Since we stripped "prestart" from "next start" in the standalone build (standalone doesn't use package.json scripts usually),
# we might need a custom entrypoint if we want to run migrations.
# For now, let's assume the user will handle migrations or we rely on the app to handle it.
# However, the user had `tsx lib/db/migrate`.
# Standalone build might not include tsx or devDependencies. 
# Let's keep it simple: just run the server. Migration can be a separate init step or we assume dev mode for now?
# The user wants "quickest way".
# Let's use the standard "node server.js" command. 
# If migration is needed, we might need a different approach, but let's try this first.

CMD ["node", "server.js"]
