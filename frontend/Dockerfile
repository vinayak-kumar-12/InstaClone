# ==========================================
# STAGE 1: Build Stage (Vite + React compilation)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies cleanly using layer caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Pass build environment variables if provided
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build optimized production bundle
RUN npm run build

# ==========================================
# STAGE 2: Production Stage (Single Nginx Gateway)
# ==========================================
FROM nginx:1.27-alpine AS runner

# Set working directory to Nginx web root
WORKDIR /usr/share/nginx/html

# Clean default Nginx static assets
RUN rm -rf ./*

# Copy built production assets from builder stage
COPY --from=builder /app/dist .

# Copy custom master Nginx configuration
COPY ../nginx/nginx.conf /etc/nginx/nginx.conf

# Expose HTTP gateway port
EXPOSE 80

# Healthcheck monitoring endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
