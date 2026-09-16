# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifest and workspace manifests
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install all dependencies including devDependencies for building
RUN npm install

# Copy source code for all packages
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
COPY packages/client ./packages/client

# Build shared, client, and server
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/client
RUN npm run build --workspace=packages/server

# ==========================================
# STAGE 2: Runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=6969
ENV DATA_DIR=/app/data

# Copy manifests
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist

# Create persistent storage folder
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 6969

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6969/api/health || exit 1

VOLUME ["/app/data"]

CMD ["node", "packages/server/dist/index.js"]
