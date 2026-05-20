# Alpine base — sidesteps the Debian apt-get GPG issues that wrecked the
# bookworm-based image on Railway. better-sqlite3 ships musl prebuilds so
# the native compile is normally a no-op; python3/make/g++ stay installed
# in the build stage as a fallback in case prebuild-install misses.
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Drop devDeps so we don't carry typescript/eslint/etc. into the runtime image.
RUN npm prune --omit=dev

# Runtime stage with the system Chromium Puppeteer points at.
FROM node:22-alpine AS runner

# Alpine's Chromium binary lands at /usr/bin/chromium-browser (not /usr/bin/
# chromium like Debian). nss/freetype/harfbuzz/ttf-freefont cover the
# minimum so PDFs don't render with missing glyphs; ca-certificates lets
# Chromium do outbound TLS if it ever needs to.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "start"]
