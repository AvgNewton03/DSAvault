# Stage 1: Build the frontend and prepare server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy project configuration and source code
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY server ./server

# Compile frontend bundle to /app/dist
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server code and required runtime config
COPY server ./server
COPY tsconfig.json ./

# Run container as non-root node user for enhanced security
USER node

EXPOSE 5000

# Container healthcheck testing /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["./node_modules/.bin/tsx", "server/index.ts"]
