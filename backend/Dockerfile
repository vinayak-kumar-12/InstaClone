# ==========================================
# STAGE 1: Dependency Installation
# ==========================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install build dependencies if needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files for layer caching
COPY package*.json ./

# Install only production dependencies cleanly
RUN npm install --only=production && npm cache clean --force

# ==========================================
# STAGE 2: Production Runner Image
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Change ownership of /app to non-root user 'node'
RUN chown -R node:node /app

# Switch to non-root user for security best practices
USER node

# Expose backend service port
EXPOSE 3000

# Healthcheck monitoring endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start production server
CMD ["node", "index.js"]
