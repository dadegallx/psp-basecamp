# Custom Caddy with replace-response plugin for widget injection
# Build: docker build -t caddy-replace ./caddy
FROM caddy:2-builder AS builder

RUN xcaddy build \
    --with github.com/caddyserver/replace-response

FROM caddy:2

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
