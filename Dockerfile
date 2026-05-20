# Build stage: install build toolchain so better-sqlite3 can compile, install
# all deps, and run `next build`. Puppeteer's bundled Chromium download is
# skipped because the runtime stage uses a system-installed Chromium instead.
FROM node:22-bookworm-slim AS builder

# apt-get update on Debian mirrors can transiently fail with a GPG signature
# mismatch when the CDN is serving a partially-updated index. Retry a handful
# of times before giving up so a flaky deploy self-heals instead of breaking
# the whole build.
RUN set -eux; \
    for i in 1 2 3 4 5; do \
        apt-get update && break; \
        echo "apt-get update attempt $i failed, retrying in 5s..."; \
        sleep 5; \
    done; \
    apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Drop devDeps so we don't carry typescript/eslint/etc. into the runtime image.
RUN npm prune --omit=dev

# Runtime stage: just Chromium + the libs Puppeteer needs, plus the built app
# and the pruned node_modules. better-sqlite3's compiled .node binary survives
# the copy because both stages use the same base image and Node version.
FROM node:22-bookworm-slim AS runner

# Same retry pattern as the builder stage — these two apt-get update calls
# are independent layers, either one can hit a flaky mirror.
RUN set -eux; \
    for i in 1 2 3 4 5; do \
        apt-get update && break; \
        echo "apt-get update attempt $i failed, retrying in 5s..."; \
        sleep 5; \
    done; \
    apt-get install -y --no-install-recommends \
        chromium \
        fonts-liberation \
        libnss3 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxkbcommon0 \
        libgbm1 \
        libasound2 \
        libcairo2 \
        libpango-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "start"]
