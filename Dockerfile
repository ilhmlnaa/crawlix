# ============================================
# Stage 1: Build Stage
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# ============================================
# Stage 2: Runtime Stage
# ============================================
FROM node:24-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs

ARG PORT
ENV PORT=${PORT}

# OpenTelemetry / SigNoz — override at runtime via docker-compose or env file
ENV OTEL_SERVICE_NAME="crawlix" \
    OTEL_EXPORTER_OTLP_ENDPOINT="" \
    OTEL_EXPORTER_OTLP_HEADERS=""

EXPOSE ${PORT}

HEALTHCHECK --interval=90s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
