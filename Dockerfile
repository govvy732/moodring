FROM node:20-alpine

# Install build deps for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production deps (skip postinstall scripts for better-sqlite3 if needed)
RUN npm ci --omit=dev

# Copy source
COPY src ./src
COPY public ./public

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 10000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:10000/health || exit 1

CMD ["node", "src/server.js"]
